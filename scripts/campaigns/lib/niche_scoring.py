"""Niche-specific firmographic ICP scoring + tier gates.

Used by score-and-tier-niche-2026.py. Pure functions, no I/O, easily testable.

ORIGINAL design (with signals): 100-point matrix where signals contributed
up to 25 points and Tier A required score >= 90 (which in practice required
at least one signal hit). For the 2026-05-26 run we skipped signal enrichment
(see RESUME notes), so scoring is FIRMOGRAPHIC ONLY and the tier gates were
adjusted to use the firmographic-max (75 points) as the new ceiling:

    Tier A:   65-75   (top firmographic profiles)
    Tier B:   50-64   (acceptable firmographic profiles)
    Drop:    <50      (fails industry / title / headcount / geo gates)

Hard gates that return 0:
    - excluded title (e.g., "Recruiter" for RECRUITER_ICP)
    - excluded industry (e.g., "Contract Staffing" for RECRUITER_ICP)

Component max points (firmographic only):
    industry_match: 25
    headcount_band: 20
    title_seniority: 20
    geo:            10
    --------------------
    max:            75

Signal columns are read if present (signal_job_post_hit, signal_headcount_hit)
and contribute +15/+10 each — so the module is forward-compatible with the
V10 signal-enrichment follow-up. With signals the original Tier A: 90+
gate is meaningful again; in firmo-only mode signals don't fire.
"""
from typing import Optional, TypedDict

class IcpConfig(TypedDict):
    name: str
    industry_match_keywords: list[str]
    industry_blacklist: list[str]
    headcount_sweet:  tuple[int, int]
    headcount_wide:   tuple[int, int]
    titles_max:       list[str]
    titles_high:      list[str]
    titles_mid:       list[str]
    excluded_titles:  list[str]

RECRUITER_ICP: IcpConfig = {
    'name': 'recruiters',
    'industry_match_keywords': [
        'executive search', 'staffing & recruiting', 'staffing and recruiting',
        'human resources services', 'retained search', 'recruiting', 'recruitment',
    ],
    'industry_blacklist': [
        'contract staffing', 'contingent', 'rpo', 'temp agency', 'temporary staffing',
    ],
    'headcount_sweet': (10, 40),
    'headcount_wide':  (5, 75),
    'titles_max':  ['managing partner', 'founder', 'founding partner'],
    'titles_high': ['managing director', 'president'],
    'titles_mid':  ['vp business development',
                    'vice president business development',
                    'practice lead', 'practice leader'],
    'excluded_titles': ['recruiter', 'sourcer', 'talent coordinator',
                        'researcher', 'intern', 'assistant'],
}

AGENCY_ICP: IcpConfig = {
    'name': 'agencies',
    'industry_match_keywords': [
        'public relations', 'pr agency', 'communications agency',
        'revops', 'revenue operations',
        'lifecycle marketing', 'crm agency',
        'demand generation', 'demand gen',
        'performance marketing', 'paid media',
        'b2b content', 'content marketing',
        'sales enablement',
        'abm', 'account-based marketing', 'account based marketing',
        'fractional cmo', 'fractional marketing',
        'marketing consultancy', 'marketing strategy',
    ],
    'industry_blacklist': [
        'design studio', 'web design', 'dev shop',
        'software development', 'branding studio',
        'graphic design',
    ],
    'headcount_sweet': (8, 30),
    'headcount_wide':  (5, 50),
    'titles_max':  ['founder', 'ceo', 'managing director', 'managing partner'],
    'titles_high': ['head of new business', 'head of growth', 'president'],
    'titles_mid':  ['coo', 'chief operating officer'],
    'excluded_titles': ['account manager', 'account executive', 'strategist',
                        'designer', 'copywriter', 'coordinator', 'assistant'],
}

def _norm(v) -> str:
    return str(v or '').strip().lower()

def score_lead(lead: dict, icp: IcpConfig) -> int:
    """Score one lead 0-100 against an ICP config.

    Inputs read from the lead dict (canonical names — score_and_tier orchestrator
    handles mapping from AI Ark metadata column names):
      - company_industry: str
      - company_headcount: int (or string parsable to int)
      - title: str
      - company_location: str (country)
      - signal_job_post_hit:  '0' | '1' (optional, defaults to '0')
      - signal_headcount_hit: '0' | '1' (optional, defaults to '0')

    Hard exclusions return 0. Otherwise sum component scores, capped at 100.
    """
    industry = _norm(lead.get('company_industry'))
    title    = _norm(lead.get('title'))
    geo      = _norm(lead.get('company_location'))
    try:
        headcount = int(lead.get('company_headcount') or 0)
    except (TypeError, ValueError):
        headcount = 0

    if any(b in industry for b in icp['industry_blacklist']):
        return 0
    for t in icp['excluded_titles']:
        if t in title:
            return 0

    score = 0

    if any(k in industry for k in icp['industry_match_keywords']):
        score += 25

    sw_lo, sw_hi = icp['headcount_sweet']
    wd_lo, wd_hi = icp['headcount_wide']
    if sw_lo <= headcount <= sw_hi:
        score += 20
    elif wd_lo <= headcount <= wd_hi:
        score += 12

    if any(t in title for t in icp['titles_max']):
        score += 20
    elif any(t in title for t in icp['titles_high']):
        score += 15
    elif any(t in title for t in icp['titles_mid']):
        score += 10

    if 'us' in geo or 'united states' in geo or 'usa' in geo:
        score += 10
    elif 'ca' in geo or 'canada' in geo:
        score += 8

    if str(lead.get('signal_job_post_hit', '0')) == '1':
        score += 15
    if str(lead.get('signal_headcount_hit', '0')) == '1':
        score += 10

    return min(100, score)

def tier_for_score(score: int, signals_present: bool = False) -> Optional[str]:
    """Return 'A' (top), 'B' (acceptable), or None (drop).

    When signals_present=True: original tier gates (A: 90-100, B: 70-89).
    When signals_present=False (firmo-only mode): scaled to firmographic-max
    of 75 → A: 65-100 (signals would tier-A anything > 65 anyway), B: 50-64.

    Drop is always <50.
    """
    if signals_present:
        if score >= 90:
            return 'A'
        if score >= 70:
            return 'B'
        return None
    # Firmographic-only
    if score >= 65:
        return 'A'
    if score >= 50:
        return 'B'
    return None
