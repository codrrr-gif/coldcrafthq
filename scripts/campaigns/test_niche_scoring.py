"""Tests for niche-specific 100-pt ICP scoring."""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from lib.niche_scoring import score_lead, tier_for_score, RECRUITER_ICP, AGENCY_ICP


class TestRecruiterScoring:
    def test_perfect_lead_with_both_signals_scores_100(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'United States',
            'signal_job_post_hit': '1',
            'signal_headcount_hit': '1',
        }
        assert score_lead(lead, RECRUITER_ICP) == 100

    def test_firmographic_only_caps_at_75(self):
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'United States',
            'signal_job_post_hit': '0',
            'signal_headcount_hit': '0',
        }
        assert score_lead(lead, RECRUITER_ICP) == 75

    def test_staffing_and_recruiting_matches(self):
        # The AI Ark API returns "Staffing & Recruiting" (with ampersand)
        # so verify ampersand variant is in industry_match_keywords
        lead = {
            'company_industry': 'Staffing & Recruiting',
            'company_headcount': 15,
            'title': 'Founder',
            'company_location': 'United States',
        }
        assert score_lead(lead, RECRUITER_ICP) == 75

    def test_excluded_industry_returns_zero(self):
        lead = {
            'company_industry': 'Contract Staffing',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'United States',
        }
        assert score_lead(lead, RECRUITER_ICP) == 0

    def test_canada_geo_scores_8(self):
        # Same lead as test_firmographic_only_caps_at_75 but Canada
        # 25 (industry) + 20 (headcount) + 20 (title) + 8 (CA) = 73
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Managing Partner',
            'company_location': 'Canada',
        }
        assert score_lead(lead, RECRUITER_ICP) == 73

    def test_headcount_out_of_band_loses_points(self):
        # 25 (industry) + 0 (headcount: 100 > 75) + 20 (title) + 10 (US) = 55
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 100,
            'title': 'Managing Partner',
            'company_location': 'United States',
        }
        assert score_lead(lead, RECRUITER_ICP) == 55

    def test_excluded_title_returns_zero(self):
        # Title contains 'recruiter' (excluded)
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'Senior Recruiter',
            'company_location': 'United States',
        }
        assert score_lead(lead, RECRUITER_ICP) == 0

    def test_vp_bd_title_scores_mid(self):
        # 25 (industry) + 20 (headcount) + 10 (vp business development, mid) + 10 (US) = 65
        lead = {
            'company_industry': 'Executive Search',
            'company_headcount': 25,
            'title': 'VP Business Development',
            'company_location': 'United States',
        }
        assert score_lead(lead, RECRUITER_ICP) == 65


class TestAgencyScoring:
    def test_perfect_agency_with_both_signals_scores_100(self):
        lead = {
            'company_industry': 'Public Relations',
            'company_headcount': 15,
            'title': 'Founder',
            'company_location': 'United States',
            'signal_job_post_hit': '1',
            'signal_headcount_hit': '1',
        }
        assert score_lead(lead, AGENCY_ICP) == 100

    def test_revops_agency_matches(self):
        lead = {
            'company_industry': 'RevOps Consultancy',
            'company_headcount': 15,
            'title': 'Founder',
            'company_location': 'United States',
        }
        assert score_lead(lead, AGENCY_ICP) == 75

    def test_design_studio_excluded(self):
        lead = {
            'company_industry': 'design studio',
            'company_headcount': 15,
            'title': 'Founder',
            'company_location': 'United States',
        }
        assert score_lead(lead, AGENCY_ICP) == 0


class TestTierGatingWithSignals:
    def test_signal_mode_tier_a_threshold(self):
        assert tier_for_score(90, signals_present=True) == 'A'
        assert tier_for_score(100, signals_present=True) == 'A'
        assert tier_for_score(89, signals_present=True) == 'B'

    def test_signal_mode_tier_b_threshold(self):
        assert tier_for_score(70, signals_present=True) == 'B'
        assert tier_for_score(89, signals_present=True) == 'B'

    def test_signal_mode_drop_threshold(self):
        assert tier_for_score(69, signals_present=True) is None
        assert tier_for_score(0, signals_present=True) is None


class TestTierGatingFirmoOnly:
    def test_firmo_mode_tier_a_threshold(self):
        # Firmo-only: top firmographic = 75; A starts at 65
        assert tier_for_score(75, signals_present=False) == 'A'
        assert tier_for_score(65, signals_present=False) == 'A'
        assert tier_for_score(64, signals_present=False) == 'B'

    def test_firmo_mode_tier_b_threshold(self):
        assert tier_for_score(50, signals_present=False) == 'B'
        assert tier_for_score(64, signals_present=False) == 'B'

    def test_firmo_mode_drop_threshold(self):
        assert tier_for_score(49, signals_present=False) is None
        assert tier_for_score(0, signals_present=False) is None

    def test_default_signals_present_is_false(self):
        # Without explicit signals_present, defaults to firmo-only gates
        assert tier_for_score(65) == 'A'
        assert tier_for_score(50) == 'B'
