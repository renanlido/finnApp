// GERADO por scripts/generate.ts a partir de tokens.json (design system FinnApp). Não edite à mão.
import type { Theme } from './buildTheme';

export const theme = {
  "colors": {
    "dark": {
      "bg": "#0C0C0E",
      "surface": "#161619",
      "surfaceInset": "#222226",
      "surfaceSunken": "#0F0F11",
      "surfaceSegment": "#161619",
      "surfaceSelected": "#2C2C31",
      "surfaceSheet": "#19191C",
      "surfaceGlass": "rgba(30,30,34,0.86)",
      "surfaceHighlight": "rgba(255,255,255,0.07)",
      "scrim": "rgba(0,0,0,0.62)",
      "border": "rgba(255,255,255,0.07)",
      "borderStrong": "rgba(255,255,255,0.18)",
      "track": "rgba(255,255,255,0.09)",
      "text": "#F4F2EF",
      "textMuted": "#A7A29C",
      "textDisabled": "#55524E",
      "brand": "#FF6B2C",
      "onBrand": "#1A0A02",
      "onBrandMuted": "rgba(26,10,2,0.76)",
      "onBrandSoft": "rgba(26,10,2,0.10)",
      "brandTint": "#FFD9C7",
      "brandText": "#FF905F",
      "brandSoft": "rgba(255,107,44,0.16)",
      "brandLine": "rgba(255,107,44,0.45)",
      "focusRing": "#FF905F",
      "accent": "#B3A7FF",
      "onAccent": "#120C2E",
      "onAccentSoft": "rgba(18,12,46,0.16)",
      "accentSoft": "rgba(179,167,255,0.16)",
      "accentSurface": "#1B1928",
      "accentStrong": "#6E5FD6",
      "accentLine": "rgba(179,167,255,0.45)",
      "negative": "#FF5C6C",
      "negativeText": "#FF8792",
      "negativeSoft": "rgba(255,92,108,0.16)",
      "negativeSurface": "#261418",
      "onNegative": "#1F0508",
      "warning": "#FFC24D",
      "warningText": "#FFC24D",
      "warningSoft": "rgba(255,194,77,0.14)",
      "warningSurface": "#241D0F",
      "onWarning": "#241A05",
      "positive": "#4FD49B",
      "positiveSoft": "rgba(79,212,155,0.14)",
      "info": "#62B8FF",
      "infoSoft": "rgba(98,184,255,0.14)",
      "inverseSurface": "#F4F2EF",
      "onInverse": "#0C0C0E",
      "onInverseMuted": "#57534D",
      "inverseTint": "rgba(12,12,14,0.08)",
      "chartNeutral": "#8F8A84",
      "chartNeutralSubtle": "#3A3936",
      "chartFixed": "#55524E",
      "catMoradia": "#E8956F",
      "catEducacao": "#C792EA",
      "catMercado": "#4FD49B",
      "catRestaurantes": "#FFB547",
      "catTransporte": "#62B8FF",
      "catCasa": "#FF7EB6",
      "catLazer": "#A6DB6A",
      "catSaude": "#4FD1C5",
      "catAssinaturas": "#B3A7FF",
      "catSeguros": "#9DB2D6",
      "catParcelas": "#E36588",
      "catOutros": "#A7A29C",
      "catReceita": "#B3A7FF",
      "accountBtg": "#3D63B0",
      "accountNubank": "#820AD1",
      "accountPagbank": "#00A868",
      "accountMercadopago": "#FFE600",
      "accountCarrefour": "#1D4FA3",
      "accountWallet": "#C9B28A",
      "finnOrbHighlight": "#FFE3CF",
      "finnOrbGlow": "#FF8A4C",
      "finnOrbCore": "#FF5A1F",
      "finnOrbEdge": "#7C5CFF"
    },
    "light": {
      "bg": "#F3F0EB",
      "surface": "#FFFFFF",
      "surfaceInset": "#EAE6DF",
      "surfaceSunken": "#F3F0EB",
      "surfaceSegment": "#EAE6DF",
      "surfaceSelected": "#FFFFFF",
      "surfaceSheet": "#FFFFFF",
      "surfaceGlass": "rgba(255,255,255,0.9)",
      "surfaceHighlight": "rgba(23,20,15,0.06)",
      "scrim": "rgba(20,16,12,0.38)",
      "border": "rgba(23,20,15,0.07)",
      "borderStrong": "rgba(23,20,15,0.2)",
      "track": "rgba(23,20,15,0.08)",
      "text": "#17140F",
      "textMuted": "#6A645C",
      "textDisabled": "#BDB6AC",
      "brand": "#FF6B2C",
      "onBrand": "#1A0A02",
      "onBrandMuted": "rgba(26,10,2,0.76)",
      "onBrandSoft": "rgba(26,10,2,0.10)",
      "brandTint": "#FFD9C7",
      "brandText": "#B8430C",
      "brandSoft": "#FFE6DA",
      "brandLine": "rgba(184,67,12,0.35)",
      "focusRing": "#B8430C",
      "accent": "#5E4FD1",
      "onAccent": "#FFFFFF",
      "onAccentSoft": "rgba(255,255,255,0.22)",
      "accentSoft": "#ECE9FF",
      "accentSurface": "#ECE9FF",
      "accentStrong": "#AFA5F2",
      "accentLine": "rgba(94,79,209,0.35)",
      "negative": "#D6334A",
      "negativeText": "#B3243A",
      "negativeSoft": "#FDE3E6",
      "negativeSurface": "#FDE3E6",
      "onNegative": "#FFFFFF",
      "warning": "#B07400",
      "warningText": "#8A5800",
      "warningSoft": "#FFF1D6",
      "warningSurface": "#FFF4DD",
      "onWarning": "#17140F",
      "positive": "#12805A",
      "positiveSoft": "#DDF5EA",
      "info": "#1767B8",
      "infoSoft": "#E1EFFD",
      "inverseSurface": "#17140F",
      "onInverse": "#F7F4EF",
      "onInverseMuted": "#B9B2A8",
      "inverseTint": "rgba(247,244,239,0.12)",
      "chartNeutral": "#948C80",
      "chartNeutralSubtle": "#CFC9BF",
      "chartFixed": "#A39C92",
      "catMoradia": "#B4532F",
      "catEducacao": "#8A4FB8",
      "catMercado": "#1E986A",
      "catRestaurantes": "#B9790F",
      "catTransporte": "#2F80D0",
      "catCasa": "#D14C8B",
      "catLazer": "#5A9421",
      "catSaude": "#0F8A80",
      "catAssinaturas": "#5E4FD1",
      "catSeguros": "#4D6A99",
      "catParcelas": "#B8325A",
      "catOutros": "#8A847B",
      "catReceita": "#5E4FD1",
      "accountBtg": "#1E3A70",
      "accountNubank": "#820AD1",
      "accountPagbank": "#00A868",
      "accountMercadopago": "#FFE600",
      "accountCarrefour": "#1D4FA3",
      "accountWallet": "#8A7350",
      "finnOrbHighlight": "#FFE3CF",
      "finnOrbGlow": "#FF8A4C",
      "finnOrbCore": "#FF5A1F",
      "finnOrbEdge": "#7C5CFF"
    }
  },
  "shadows": {
    "dark": {
      "shadowCard": "inset 0 0 0 1px rgba(255,255,255,0.05)",
      "shadowFloat": "inset 0 0 0 1px rgba(255,255,255,0.08), 0 12px 32px rgba(0,0,0,0.5)",
      "shadowSegment": "none",
      "shadowSheet": "0 -10px 24px rgba(0,0,0,0.4)",
      "shadowOrb": "0 0 16px rgba(255,107,44,0.45), inset -3px -5px 10px rgba(40,20,90,0.4)",
      "ringSelected": "0 0 0 3px #0C0C0E, 0 0 0 5px #F4F2EF"
    },
    "light": {
      "shadowCard": "0 1px 2px rgba(40,28,16,0.05), 0 10px 30px rgba(40,28,16,0.07)",
      "shadowFloat": "0 1px 2px rgba(40,28,16,0.06), 0 12px 32px rgba(40,28,16,0.14)",
      "shadowSegment": "0 1px 3px rgba(40,28,16,0.12)",
      "shadowSheet": "0 -8px 20px rgba(40,28,16,0.10)",
      "shadowOrb": "0 0 16px rgba(255,107,44,0.45), inset -3px -5px 10px rgba(40,20,90,0.4)",
      "ringSelected": "0 0 0 3px #F3F0EB, 0 0 0 5px #17140F"
    }
  },
  "type": {
    "amountDisplay": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 104,
      "lineHeight": 94,
      "letterSpacing": -6.24
    },
    "amountDisplayS": {
      "fontFamily": "Urbanist_800ExtraBold",
      "fontSize": 80,
      "lineHeight": 80,
      "letterSpacing": -4
    },
    "amountHero": {
      "fontFamily": "Urbanist_800ExtraBold",
      "fontSize": 56,
      "lineHeight": 56,
      "letterSpacing": -2.8
    },
    "amountXl": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 40,
      "lineHeight": 42,
      "letterSpacing": -1.6
    },
    "titleScreen": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 34,
      "lineHeight": 36,
      "letterSpacing": -1.02
    },
    "amountL": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 28,
      "lineHeight": 31,
      "letterSpacing": -0.84
    },
    "titleSheet": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 22,
      "lineHeight": 26,
      "letterSpacing": -0.22
    },
    "titleCard": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 20,
      "lineHeight": 24,
      "letterSpacing": 0
    },
    "amountM": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 17,
      "lineHeight": 20,
      "letterSpacing": -0.17
    },
    "amount": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 16,
      "lineHeight": 19,
      "letterSpacing": 0
    },
    "amountS": {
      "fontFamily": "Urbanist_700Bold",
      "fontSize": 15,
      "lineHeight": 18,
      "letterSpacing": 0
    },
    "txtL": {
      "fontFamily": "InstrumentSans_700Bold",
      "fontSize": 17,
      "lineHeight": 23,
      "letterSpacing": 0
    },
    "txtStrong": {
      "fontFamily": "InstrumentSans_600SemiBold",
      "fontSize": 15,
      "lineHeight": 21,
      "letterSpacing": 0
    },
    "txtBody": {
      "fontFamily": "InstrumentSans_400Regular",
      "fontSize": 15,
      "lineHeight": 22,
      "letterSpacing": 0
    },
    "txtLabel": {
      "fontFamily": "InstrumentSans_600SemiBold",
      "fontSize": 14,
      "lineHeight": 19,
      "letterSpacing": 0
    },
    "txtS": {
      "fontFamily": "InstrumentSans_400Regular",
      "fontSize": 14,
      "lineHeight": 20,
      "letterSpacing": 0
    },
    "txtCaption": {
      "fontFamily": "InstrumentSans_400Regular",
      "fontSize": 13,
      "lineHeight": 18,
      "letterSpacing": 0
    },
    "txtMeta": {
      "fontFamily": "InstrumentSans_400Regular",
      "fontSize": 12,
      "lineHeight": 16,
      "letterSpacing": 0
    },
    "txtTag": {
      "fontFamily": "InstrumentSans_600SemiBold",
      "fontSize": 11,
      "lineHeight": 11,
      "letterSpacing": -0.11
    },
    "txtOverline": {
      "fontFamily": "InstrumentSans_700Bold",
      "fontSize": 11,
      "lineHeight": 13,
      "letterSpacing": 0.44
    }
  },
  "space": {
    "2": 2,
    "4": 4,
    "6": 6,
    "8": 8,
    "10": 10,
    "12": 12,
    "14": 14,
    "16": 16,
    "20": 20,
    "24": 24,
    "28": 28,
    "32": 32,
    "40": 40,
    "56": 56
  },
  "radius": {
    "xs": 2,
    "bar": 4,
    "s": 12,
    "m": 14,
    "l": 20,
    "xl": 24,
    "2xl": 28,
    "full": 999
  },
  "size": {
    "touch": 44,
    "control-m": 48,
    "control-l": 56,
    "row": 64,
    "nav": 60,
    "icon-tile": 42,
    "icon": 20,
    "icon-s": 16,
    "dot": 8
  },
  "duration": {
    "fast": 120,
    "base": 200,
    "slow": 280,
    "undo": 6000
  },
  "easing": {
    "enter": [
      0.32,
      0.72,
      0,
      1
    ],
    "exit": [
      0.4,
      0,
      1,
      1
    ]
  }
} as const satisfies Theme;
