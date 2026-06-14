using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace AuthService.Services;

public class SagaMessagingService : IDisposable
{
    private readonly string _rabbitHost;
    private IConnection? _connection;
    private readonly object _lock = new();

    public SagaMessagingService()
    {
        _rabbitHost = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "rabbitmq";
    }

    private IConnection GetConnection()
    {
        lock (_lock)
        {
            if (_connection == null || !_connection.IsOpen)
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
                        Console.WriteLine("[Auth] RabbitMQ connected.");
                        break;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Auth] RabbitMQ not ready, retry {i + 1}/10: {ex.Message}");
                        Thread.Sleep(3000);
                    }
                }
            }
            return _connection!;
        }
    }

    // SAGA #1: šalje zahtjev za kreiranje profila i čeka odgovor (RPC over RabbitMQ)
    public async Task<bool> InitProfileAsync(long userId, string username, string role)
    {
        using var channel = GetConnection().CreateModel();

        channel.QueueDeclare("saga.profile.init", durable: true, exclusive: false, autoDelete: false);

        // Privremeni reply queue — ekskluzivan, automatski se briše
        var replyQueue = channel.QueueDeclare("", durable: false, exclusive: true, autoDelete: true).QueueName;
        var correlationId = Guid.NewGuid().ToString();

        var tcs = new TaskCompletionSource<bool>();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        cts.Token.Register(() => tcs.TrySetException(new TimeoutException("Stakeholders service nije odgovorio na vrijeme")));

        var consumer = new EventingBasicConsumer(channel);
        consumer.Received += (_, ea) =>
        {
            if (ea.BasicProperties.CorrelationId != correlationId) return;
            var result = Encoding.UTF8.GetString(ea.Body.ToArray());
            tcs.TrySetResult(result == "true");
        };
        channel.BasicConsume(replyQueue, autoAck: true, consumer: consumer);

        var props = channel.CreateBasicProperties();
        props.CorrelationId = correlationId;
        props.ReplyTo = replyQueue;

        var body = JsonSerializer.SerializeToUtf8Bytes(new { UserId = userId, Username = username, Role = role });
        channel.BasicPublish("", "saga.profile.init", props, body);

        return await tcs.Task;
    }

    public void Dispose()
    {
        _connection?.Close();
        _connection?.Dispose();
    }
}
