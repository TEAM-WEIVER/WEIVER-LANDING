package com.weiver.landing.reservation;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Rejects coercion/unknown fields and distinguishes omitted selection fields from explicit null. */
public class CreateReservationRequestDeserializer extends JsonDeserializer<CreateReservationRequest> {
    private static final Set<String> FIELDS = Set.of("visitorId", "sessionId", "name", "email",
        "reservationType", "privacyConsent", "utm", "jobFamily", "applicantType", "primaryRole");

    @Override
    public CreateReservationRequest deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        JsonNode node = parser.getCodec().readTree(parser);
        if (!node.isObject()) throw new InvalidReservationRequestException();
        node.fieldNames().forEachRemaining(field -> {
            if (!FIELDS.contains(field)) throw new InvalidReservationRequestException();
        });
        return new CreateReservationRequest(
            uuid(node, "visitorId"), uuid(node, "sessionId"), text(node, "name", false),
            text(node, "email", false), text(node, "reservationType", false), consent(node), utm(node),
            text(node, "jobFamily", true), text(node, "applicantType", true), text(node, "primaryRole", true));
    }

    private String text(JsonNode node, String field, boolean rejectNull) {
        JsonNode value = node.get(field);
        if (value == null) return null;
        if (value.isNull() && !rejectNull) return null;
        if (!value.isTextual()) throw new InvalidReservationRequestException();
        return value.textValue();
    }

    private UUID uuid(JsonNode node, String field) {
        String value = text(node, field, false);
        if (value == null) return null;
        try {
            UUID id = UUID.fromString(value);
            if (!id.toString().equalsIgnoreCase(value)) throw new InvalidReservationRequestException();
            return id;
        } catch (IllegalArgumentException ex) {
            throw new InvalidReservationRequestException();
        }
    }

    private Boolean consent(JsonNode node) {
        JsonNode value = node.get("privacyConsent");
        if (value == null || value.isNull()) return null;
        if (!value.isBoolean()) throw new InvalidReservationRequestException();
        return value.booleanValue();
    }

    private Map<String, String> utm(JsonNode node) {
        JsonNode value = node.get("utm");
        if (value == null || value.isNull()) return Map.of();
        if (!value.isObject()) throw new InvalidReservationRequestException();
        Map<String, String> utm = new HashMap<>();
        value.properties().forEach(entry -> {
            if (!entry.getValue().isTextual() && !entry.getValue().isNull()) {
                throw new InvalidReservationRequestException();
            }
            utm.put(entry.getKey(), entry.getValue().isNull() ? null : entry.getValue().textValue());
        });
        return utm;
    }
}
