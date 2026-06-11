package com.company.tms;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashGenTest {

    @Test
    public void generateHash() {
        String hash = new BCryptPasswordEncoder().encode("Admin@123");
        System.out.println("HASH_START:" + hash + ":HASH_END");
    }
}
