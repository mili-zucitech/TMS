package com.company.tms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
// Scans for @ConfigurationProperties classes (e.g., CorsProperties) in this package tree.
@ConfigurationPropertiesScan
public class TmsBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TmsBackendApplication.class, args);
    }
}
