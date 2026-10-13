package com.weiver.landing.reservation;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.*;
import java.util.Map;
import java.util.UUID;

@JsonDeserialize(using = CreateReservationRequestDeserializer.class)
public record CreateReservationRequest(
    @NotNull UUID visitorId,
    @NotNull UUID sessionId,
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email,
    @NotNull @Pattern(regexp = "QUICK_AI_INTERVIEW|REVERSE_MATCHING") String reservationType,
    @NotNull @AssertTrue Boolean privacyConsent,
    Map<String, String> utm,
    String jobFamily,
    String applicantType,
    String primaryRole
) {}
