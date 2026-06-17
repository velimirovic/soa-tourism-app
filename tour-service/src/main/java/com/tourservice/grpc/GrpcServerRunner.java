package com.tourservice.grpc;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PreDestroy;

// Disabled: TourExecutionGrpcService is now managed by net.devh grpc-server-spring-boot-starter
// @Component
public class GrpcServerRunner {

    private static final Logger log = LoggerFactory.getLogger(GrpcServerRunner.class);

    @Autowired
    private TourExecutionGrpcService tourExecutionGrpcService;

    @Value("${grpc.server.port:9090}")
    private int grpcPort;

    private Server server;

    @EventListener(ApplicationReadyEvent.class)
    public void start() throws IOException {
        server = ServerBuilder.forPort(grpcPort)
                .addService(tourExecutionGrpcService)
                .build()
                .start();
        log.info("gRPC server started on port {}", grpcPort);
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            log.info("Stopping gRPC server...");
            server.shutdownNow();
        }
    }
}
