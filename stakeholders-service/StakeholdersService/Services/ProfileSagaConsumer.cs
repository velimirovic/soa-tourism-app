using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using StakeholdersService.Infrastructure;
using StakeholdersService.Models;
using System.Text;
using System.Text.Json;

namespace StakeholdersService.Services;

// SAGA #1: prima zahtjev od auth-service za kreiranje profila i šalje odgovor
public class ProfileSagaConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly string _rabbitHost;
    private IConnection? _connection;
    private IModel? _channel;

    public ProfileSagaConsumer(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
        _rabbitHost   = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "rabbitmq";
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _rabbitHost,
            UserName = "guest",
            Password = "guest"
        };

        for (int i = 0; i < 10; i++)
        {
            try
            {
                _connection = factory.CreateConnection();
                Console.WriteLine("[Stakeholders] RabbitMQ connected.");
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Stakeholders] RabbitMQ not ready, retry {i + 1}/10: {ex.Message}");
                Thread.Sleep(3000);
            }
        }

        _channel = _connection!.CreateModel();
        _channel.QueueDeclare("saga.profile.init", durable: true, exclusive: false, autoDelete: false);
        _channel.BasicQos(0, 1, false); // jedan po jedan

        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            bool success = false;
            try
            {
                var message = JsonSerializer.Deserialize<ProfileInitMessage>(ea.Body.ToArray())!;

                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<StakeholdersDbContext>();

                var existing = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == message.UserId);
                if (existing == null)
                {
                    db.UserProfiles.Add(new UserProfile
                    {
                        UserId    = message.UserId,
                        FirstName = "",
                        LastName  = ""
                    });
                    await db.SaveChangesAsync();
                }
                success = true;
                Console.WriteLine($"[Stakeholders] Profil kreiran za korisnika {message.UserId}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Stakeholders] Greška pri kreiranju profila: {ex.Message}");
            }

            // Odgovor auth-service-u sa rezultatom
            var replyProps = _channel.CreateBasicProperties();
            replyProps.CorrelationId = ea.BasicProperties.CorrelationId;

            var replyBody = Encoding.UTF8.GetBytes(success ? "true" : "false");
            _channel.BasicPublish("", ea.BasicProperties.ReplyTo, replyProps, replyBody);
            _channel.BasicAck(ea.DeliveryTag, false);
        };

        _channel.BasicConsume("saga.profile.init", autoAck: false, consumer: consumer);

        stoppingToken.WaitHandle.WaitOne();
        return Task.CompletedTask;
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }

    private record ProfileInitMessage(long UserId, string Username, string Role);
}
