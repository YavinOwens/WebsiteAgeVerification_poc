"""
Configuration file for Age Verification Audit Tool
"""

# Ollama Configuration
OLLAMA_MODEL = "phi3"  # Using phi3 model
OLLAMA_HOST = "http://localhost:11434"  # Default Ollama host

# Browser Configuration
BROWSER_HEADLESS = True
BROWSER_WINDOW_SIZE = (1920, 1080)
PAGE_LOAD_TIMEOUT = 10
SCREENSHOT_ENABLED = True

# Analysis Configuration
MAX_CONTENT_LENGTH = 3000  # Maximum characters to send to Ollama
CONFIDENCE_THRESHOLD = 0.5  # Minimum confidence score to consider verification found

# Output Configuration
OUTPUT_DIR = "results"
SCREENSHOT_DIR = "screenshots"
CSV_OUTPUT = True
JSON_OUTPUT = True

# Website Categories for Testing
WEBSITE_CATEGORIES = {
    "pornography_uk": [
        "https://www.pornhub.com",
        "https://www.xvideos2.uk",
        "https://xhamster.com",
        "https://www.redtube.com",
        "https://onlyfans.com/onlyfans",
        "https://www.fabswingers.com",
        "https://adultwork.uk.com",
        "https://www.adultwork.com/HomeIE.asp",
        "https://xhamsterlive.com",
        "https://spankbang.com",
        "https://fuq.com",
        "https://www.redgifs.com",
        "https://www.literotica.com",
        "https://motherless.com",
        "https://thisvid.com",
        "https://theporndude.com",
        "https://www.vivastreet.co.uk"
    ],
    "weapons_firearms_uk": [
        "https://www.sportsmanguncentre.co.uk",
        "https://www.guntrader.uk",
        "https://www.gunstar.co.uk",
        "https://www.avalonguns.co.uk",
        "https://www.theknightshop.com",
        "https://www.blades-uk.com",
        "https://www.southernswords.co.uk"
    ],
    "social_media_platforms": [
        "https://www.reddit.com",
        "https://x.com",
        "https://discord.com",
        "https://bsky.app",
        "https://www.grindr.com",
        "https://www.patreon.com"
    ],
    "restricted_ecommerce_uk": [
        "https://www.drinksupermarket.com",
        "https://www.majestic.co.uk",
        "https://www.vapouriz.co.uk",
        "https://www.vapesuperstore.co.uk",
        "https://www.galacticfireworks.co.uk"
    ],
    "alcohol": [
        "https://www.alcohol.com",
        "https://www.drizly.com",
        "https://www.totalwine.com",
        "https://www.bevmo.com"
    ],
    "gambling": [
        "https://www.casino.com",
        "https://www.bet365.com",
        "https://www.pokerstars.com",
        "https://www.draftkings.com"
    ],
    "adult_content": [
        "https://www.pornhub.com",
        "https://www.xvideos.com",
        "https://www.xnxx.com",
        "https://www.redtube.com"
    ],
    "social_media": [
        "https://www.facebook.com",
        "https://www.instagram.com",
        "https://www.twitter.com",
        "https://www.tiktok.com",
        "https://www.youtube.com",
        "https://www.reddit.com"
    ],
    "tobacco": [
        "https://www.cigarettes.com",
        "https://www.tobacco.com",
        "https://www.smoking.com"
    ],
    "gaming": [
        "https://www.steam.com",
        "https://www.epicgames.com",
        "https://www.roblox.com",
        "https://www.minecraft.net"
    ]
}

# Age Verification Types
VERIFICATION_TYPES = [
    "birth_date_input",
    "age_checkbox", 
    "credit_card",
    "government_id",
    "social_security",
    "age_popup",
    "terms_acceptance",
    "parental_consent",
    "none"
]

# Analysis Prompts
ANALYSIS_PROMPT_TEMPLATE = """
Analyze the following website content for age verification mechanisms.

Website: {url}
Content: {content}

Please provide a JSON response with the following structure:
{{
    "has_age_verification": boolean,
    "verification_type": "string (e.g., 'birth_date_input', 'age_checkbox', 'credit_card', 'government_id', 'none')",
    "confidence_score": float (0.0 to 1.0),
    "details": "string describing what you found"
}}

Look for:
1. Age verification popups or overlays
2. Birth date input fields
3. Age confirmation checkboxes
4. Credit card verification requirements
5. Government ID verification
6. Age-related warnings or disclaimers
7. Terms of service mentioning age requirements
8. Parental consent forms
9. Age gate mechanisms
10. Age restriction notices
"""

# Error Messages
ERROR_MESSAGES = {
    "ollama_connection": "Could not connect to Ollama. Make sure Ollama is running.",
    "website_access": "Could not access website. Check URL and internet connection.",
    "browser_setup": "Could not setup browser. Check Chrome installation.",
    "json_parse": "Could not parse Ollama response as JSON.",
    "screenshot": "Could not take screenshot."
} 