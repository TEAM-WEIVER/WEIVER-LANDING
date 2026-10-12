package com.weiver.landing.reservation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationRepositoryTest {

    @Mock JdbcClient jdbc;
    @Mock JdbcClient.StatementSpec statement;
    @Captor ArgumentCaptor<String> sql;

    // AC-PC-3
    @Test
    @DisplayName("동의 시각은 클라이언트 입력이 아닌 DB 서버 시각으로 INSERT한다")
    void insert_usesDatabaseServerTimeForConsent() {
        when(jdbc.sql(sql.capture())).thenReturn(statement);
        when(statement.param(anyString(), any())).thenReturn(statement);
        when(statement.update()).thenReturn(1);

        new ReservationRepository(jdbc).insert(consentedRequest(), "{}");

        assertThat(sql.getValue()).contains("CURRENT_TIMESTAMP").doesNotContain(":consentAt");
        verify(statement, never()).param(org.mockito.ArgumentMatchers.eq("consentAt"), any());
    }

    private CreateReservationRequest consentedRequest() {
        return new CreateReservationRequest(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "홍길동",
            "test@example.com",
            "QUICK_AI_INTERVIEW",
            true,
            Map.of(), null, null, null
        );
    }
}
