package com.weiver.landing.reservation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import java.util.UUID;

public record CreateReservationRequest(
    @NotNull UUID visitorId,
    @NotNull UUID sessionId,
    @NotBlank String name,
    @NotBlank @Email String email,
    @NotNull
    @Pattern(regexp = "QUICK_AI_INTERVIEW|REVERSE_MATCHING",
             message = "허용되지 않는 reservationType")
    String reservationType,
    @NotNull @AssertTrue Boolean privacyConsent,
    Map<String, String> utm
) {}
