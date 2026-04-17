"""
Regex-based NLP parser with Spanish language support.
Parses natural language finance utterances (text + voice transcription).
Extend with an LLM fallback by setting OPENAI_API_KEY in .env.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Pattern

from app.models import CurrencyCode, TransactionDirection
from app.schemas.transaction import ParseResult

# ── Compiled patterns (module-level → compiled once) ─────────────────────────

def _c(pattern: str, flags: int = re.IGNORECASE) -> Pattern[str]:
    return re.compile(pattern, flags)


_EXPENSE_RE = _c(r"\b(gast[eé]|pagu[eé]|compr[eé]|sali[oó]|egres[oó]|cobr[eé] de más|desembolsé|invertí)\b")
_INCOME_RE = _c(r"\b(recib[ií]|cobr[eé]|ingres[eé]|depositaron|ganaron|entr[oó]|me pagaron|llegó)\b")
_TRANSFER_RE = _c(r"\b(transfer[ií]|moví|mov[ií]|pasé|mandr?é|envié)\b")

# Amount: $1,500.00 | 1.500,00 (European) | 1500 | 1,500 | 50.5
_AMOUNT_RE = _c(
    r"\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,8})?|\d+(?:[.,]\d{1,8})?)"
    r"(?:\s*(?:pesos?|dólares?|quetzales?|euros?|USD|GTQ|MXN|EUR|BTC|USDT|bitcoins?|tether))?"
)

_CURRENCY_MAP: list[tuple[Pattern[str], CurrencyCode]] = [
    (_c(r"\b(USD|dólar(?:es)?|\$)\b"), CurrencyCode.USD),
    (_c(r"\b(GTQ|quetzal(?:es)?)\b"), CurrencyCode.GTQ),
    (_c(r"\b(MXN|peso(?:s)?\s+mexicano(?:s)?)\b"), CurrencyCode.MXN),
    (_c(r"\b(EUR|euro(?:s)?|€)\b"), CurrencyCode.EUR),
    (_c(r"\b(BTC|bitcoin(?:s)?)\b"), CurrencyCode.BTC),
    (_c(r"\b(USDT|tether)\b"), CurrencyCode.USDT),
]

_ACCOUNT_MAP: list[tuple[Pattern[str], str]] = [
    (_c(r"\b(efectivo|cash|billetera|monedero|en mano)\b"), "cash"),
    (_c(r"\b(banco|tarjeta|cuenta|débito|crédito|card|bancari[ao])\b"), "bank"),
    (_c(r"\b(cripto|crypto|bitcoin|wallet|digital|metamask|binance)\b"), "digital"),
]

_TRANSFER_ACCOUNTS_RE = _c(
    r"\bde\s+(?:mi\s+)?(?:cuenta\s+)?(?:de\s+)?(\w+(?:\s+\w+)?)\s+a\s+(?:mi\s+)?(?:cuenta\s+)?(?:de\s+)?(\w+(?:\s+\w+)?)"
)

_CATEGORY_MAP: list[tuple[Pattern[str], str]] = [
    (_c(r"\b(comida|restaurante|almuerzo|cena|desayuno|café|cafe|super(?:mercado)?|tienda|víveres|mercado)\b"), "Alimentación"),
    (_c(r"\b(uber|taxi|bus|gasolina|combustible|transporte|metro|moto|pasaje|camión)\b"), "Transporte"),
    (_c(r"\b(renta|alquiler|luz|agua|electricidad|internet|cable|casa|apartamento|habitación|hipoteca)\b"), "Vivienda"),
    (_c(r"\b(doctor|médico|farmacia|medicina|hospital|clínica|salud|consulta|examen)\b"), "Salud"),
    (_c(r"\b(netflix|cine|spotify|juego(?:s)?|diversión|concierto|evento|suscripción|streaming|disco)\b"), "Entretenimiento"),
    (_c(r"\b(escuela|universidad|curso|libro(?:s)?|educación|clase(?:s)?|tutoría|colegio)\b"), "Educación"),
    (_c(r"\b(ropa|zapatos?|camisa|pantalón|vestido|tienda\s+de\s+ropa|outfit)\b"), "Ropa"),
    (_c(r"\b(tecnología|computadora|celular|laptop|teléfono|app|software|gadget)\b"), "Tecnología"),
    (_c(r"\b(ahorro|inversión|fondo|piggy|reserva)\b"), "Ahorro"),
]

_DATE_MAP: list[tuple[Pattern[str], int]] = [
    (_c(r"\b(hoy|today)\b"), 0),
    (_c(r"\b(ayer|yesterday)\b"), -1),
    (_c(r"\b(anteayer|antes\s+de\s+ayer)\b"), -2),
]

_WEEKDAY_MAP: dict[str, int] = {
    "lunes": 0, "martes": 1, "miércoles": 2, "miercoles": 2,
    "jueves": 3, "viernes": 4, "sábado": 5, "sabado": 5, "domingo": 6,
}
_WEEKDAY_RE = _c(r"\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b")

# Spanish number words → int (voice-friendly)
_WORD_NUMBERS: dict[str, int] = {
    "cero": 0, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4,
    "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
    "veinte": 20, "veintiuno": 21, "veintidós": 22, "veintitrés": 23,
    "treinta": 30, "cuarenta": 40, "cincuenta": 50,
    "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90,
    "cien": 100, "ciento": 100, "doscientos": 200, "trescientos": 300,
    "cuatrocientos": 400, "quinientos": 500, "seiscientos": 600,
    "setecientos": 700, "ochocientos": 800, "novecientos": 900,
    "mil": 1000, "dos mil": 2000, "tres mil": 3000, "cinco mil": 5000,
    "diez mil": 10000, "cien mil": 100000,
}
_WORD_NUM_RE = _c(r"\b(" + "|".join(re.escape(k) for k in sorted(_WORD_NUMBERS, key=len, reverse=True)) + r")\b")


def _normalize(text: str) -> str:
    """Lowercase + strip accents for more lenient matching."""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _parse_amount(text: str) -> Decimal | None:
    # Try word-number first (voice: "cien pesos")
    wm = _WORD_NUM_RE.search(text)
    if wm:
        try:
            return Decimal(str(_WORD_NUMBERS[wm.group(1).lower()]))
        except (KeyError, InvalidOperation):
            pass

    for m in _AMOUNT_RE.finditer(text):
        raw = m.group(1).replace(" ", "")
        # Normalise European comma-decimal: 1.500,50 → 1500.50
        if raw.count(",") == 1 and raw.count(".") >= 1 and raw.rindex(",") > raw.rindex("."):
            raw = raw.replace(".", "").replace(",", ".")
        elif "," in raw and "." not in raw:
            # Could be thousands separator (1,500) or decimal (1,50)
            parts = raw.split(",")
            raw = raw.replace(",", ".") if len(parts[-1]) <= 2 else raw.replace(",", "")
        try:
            value = Decimal(raw)
            if value > 0:
                return value
        except InvalidOperation:
            continue
    return None


def _parse_currency(text: str) -> CurrencyCode:
    for pattern, code in _CURRENCY_MAP:
        if pattern.search(text):
            return code
    return CurrencyCode.USD


def _parse_direction(text: str) -> TransactionDirection | None:
    if _TRANSFER_RE.search(text):
        return TransactionDirection.transfer
    if _INCOME_RE.search(text):
        return TransactionDirection.income
    if _EXPENSE_RE.search(text):
        return TransactionDirection.expense
    return None


def _parse_category(text: str) -> str | None:
    for pattern, name in _CATEGORY_MAP:
        if pattern.search(text):
            return name
    return None


def _parse_account_type(text: str) -> str | None:
    for pattern, atype in _ACCOUNT_MAP:
        if pattern.search(text):
            return atype
    return None


def _parse_transfer_accounts(text: str) -> tuple[str | None, str | None]:
    m = _TRANSFER_ACCOUNTS_RE.search(text)
    if not m:
        return None, None
    src_raw, dst_raw = m.group(1).strip(), m.group(2).strip()

    def _classify(hint: str) -> str | None:
        for pattern, atype in _ACCOUNT_MAP:
            if pattern.search(hint):
                return atype
        return None

    return _classify(src_raw), _classify(dst_raw)


def _parse_date(text: str) -> date | None:
    today = date.today()

    for pattern, delta in _DATE_MAP:
        if pattern.search(text):
            return today + timedelta(days=delta)

    wm = _WEEKDAY_RE.search(text)
    if wm:
        target_wd = _WEEKDAY_MAP[_normalize(wm.group(1))]
        delta = (today.weekday() - target_wd) % 7
        return today - timedelta(days=delta or 7)

    return None


def _build_description(text: str, direction: TransactionDirection | None, category: str | None) -> str | None:
    clean = re.sub(r"\d+([.,]\d+)?", "", text).strip()
    clean = re.sub(r"\s{2,}", " ", clean)
    return clean[:120] if clean else category


def parse(text: str) -> ParseResult:
    result = ParseResult(raw_text=text)
    norm = _normalize(text)

    result.direction = _parse_direction(norm)
    result.amount = _parse_amount(norm)
    result.currency = _parse_currency(norm)
    result.category_hint = _parse_category(norm)
    result.transaction_date = _parse_date(norm)
    result.description = _build_description(text, result.direction, result.category_hint)

    if result.direction == TransactionDirection.transfer:
        src_hint, dst_hint = _parse_transfer_accounts(norm)
        result.account_type_hint = src_hint or _parse_account_type(norm)
        result.to_account_type_hint = dst_hint
    else:
        result.account_type_hint = _parse_account_type(norm)

    # Confidence scoring
    score = 0.0
    if result.amount is not None:
        score += 0.40
    if result.direction is not None:
        score += 0.30
    if result.category_hint:
        score += 0.15
    if result.account_type_hint:
        score += 0.10
    if result.transaction_date:
        score += 0.05
    result.confidence = round(min(score, 1.0), 2)

    return result
