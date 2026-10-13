package com.weiver.landing.reservation;

import java.util.Map;
import java.util.Set;

/** Stable v1 codes from docs/spec/survey-contract.md §2 and §8. */
public final class SurveySelection {
    private SurveySelection() {}

    public static final Set<String> APPLICANT_TYPES = Set.of(
        "student", "entry_level", "experienced", "employed_no_change", "other");
    public static final Map<String, Set<String>> ROLES = Map.of(
        "FE", Set.of("web_frontend", "mobile_cross_platform", "design_system", "performance_platform", "interactive_graphics", "undecided", "other"),
        "BE", Set.of("server_api", "distributed_systems", "data_engineering", "devops_sre", "undecided", "other"),
        "AI", Set.of("llm_genai", "cv_multimodal", "nlp_speech", "recommendation_search", "mlops_platform", "robotics_edge", "ml_engineer", "research_engineer", "undecided", "other"));

    public static void validate(CreateReservationRequest req, boolean strict) {
        if (req.jobFamily() == null && req.applicantType() == null && req.primaryRole() == null) {
            if (strict) throw new InvalidReservationRequestException();
            return;
        }
        if (req.jobFamily() == null || req.applicantType() == null || req.primaryRole() == null
                || !APPLICANT_TYPES.contains(req.applicantType())
                || !ROLES.getOrDefault(req.jobFamily(), Set.of()).contains(req.primaryRole())) {
            throw new InvalidReservationRequestException();
        }
    }
}
