const express = require("express");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const xml2js = require("xml2js");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const PORT = process.env.PORT || 3001;

const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://economic-ai-dashboard-eta.vercel.app";

// ============================================================
// PREMIUM PLAN
// ============================================================

const PREMIUM_PRICE_KES = 499;

// Paystack uses currency subunits.
// KES 499 = 49,900
const PREMIUM_AMOUNT = PREMIUM_PRICE_KES * 100;

// ============================================================
// CORS
// ============================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ============================================================
// PAYSTACK WEBHOOK
// IMPORTANT: MUST COME BEFORE express.json()
// ============================================================

app.post(
  "/api/payment/webhook",
  express.raw({
    type: "application/json",
  }),
  (req, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        console.error(
          "Webhook received but PAYSTACK_SECRET_KEY is not configured"
        );

        return res.sendStatus(500);
      }

      const signature =
        req.headers["x-paystack-signature"];

      if (!signature) {
        console.error(
          "Paystack webhook rejected: missing signature"
        );

        return res.sendStatus(401);
      }

      const hash = crypto
        .createHmac(
          "sha512",
          PAYSTACK_SECRET_KEY
        )
        .update(req.body)
        .digest("hex");

      if (hash !== signature) {
        console.error(
          "Paystack webhook rejected: invalid signature"
        );

        return res.sendStatus(401);
      }

      const event = JSON.parse(
        req.body.toString("utf8")
      );

      console.log(
        "Paystack webhook received:",
        event?.event
      );

      if (
        event?.event ===
        "charge.success"
      ) {
        const payment = event.data;

        const correctAmount =
          Number(payment?.amount) ===
          PREMIUM_AMOUNT;

        const correctCurrency =
          payment?.currency === "KES";

        if (
          correctAmount &&
          correctCurrency
        ) {
          console.log(
            "NexusEconomics Premium payment confirmed:",
            {
              reference:
                payment?.reference,
              amount:
                payment?.amount,
              currency:
                payment?.currency,
              email:
                payment?.customer
                  ?.email,
            }
          );

          /*
            FUTURE PRODUCTION STEP:

            Save/update the user's Premium
            entitlement in your database here.

            Example fields:

            email
            paymentReference
            premiumStartedAt
            premiumExpiresAt
            paymentStatus
          */
        } else {
          console.warn(
            "Payment succeeded but amount/currency did not match Premium plan",
            {
              amount:
                payment?.amount,
              currency:
                payment?.currency,
            }
          );
        }
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error(
        "Paystack webhook error:",
        error.message
      );

      return res.sendStatus(500);
    }
  }
);

// ============================================================
// NORMAL JSON MIDDLEWARE
// ============================================================

app.use(express.json());

// ============================================================
// FRONTEND
// ============================================================

const frontendPath = path.join(
  __dirname,
  "..",
  "dist"
);

app.use(express.static(frontendPath));

// ============================================================
// COUNTRY INFLATION DATA
// ============================================================

const countryInflation = {
  Kenya: {
    rate: 3.6,
    trend: [
      3.2,
      3.4,
      3.6,
      3.8,
      3.9,
      3.7,
      3.6,
      3.5,
      3.6,
      3.7,
      3.6,
      3.6,
    ],
  },

  Uganda: {
    rate: 3.5,
    trend: [
      3.8,
      3.6,
      3.4,
      3.2,
      3.3,
      3.5,
      3.6,
      3.5,
      3.4,
      3.5,
      3.5,
      3.5,
    ],
  },

  Tanzania: {
    rate: 3.1,
    trend: [
      3.5,
      3.4,
      3.3,
      3.2,
      3.1,
      3.0,
      3.1,
      3.2,
      3.1,
      3.0,
      3.1,
      3.1,
    ],
  },

  Rwanda: {
    rate: 4.8,
    trend: [
      5.2,
      5.0,
      4.9,
      4.8,
      4.7,
      4.8,
      4.9,
      4.8,
      4.7,
      4.8,
      4.8,
      4.8,
    ],
  },

  Ethiopia: {
    rate: 9.4,
    trend: [
      11.0,
      10.5,
      10.2,
      9.9,
      9.7,
      9.5,
      9.4,
      9.4,
      9.3,
      9.4,
      9.4,
      9.4,
    ],
  },
};

// ============================================================
// INFLATION MONTHS
// ============================================================

const months = [
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
];

// ============================================================
// NEWS SEARCH QUERIES
// ============================================================

const newsQueries = {
  Kenya:
    "Kenya economy OR Kenya business OR Kenya markets",

  Uganda:
    "Uganda economy OR Uganda business OR Uganda markets",

  Tanzania:
    "Tanzania economy OR Tanzania business OR Tanzania markets",

  Rwanda:
    "Rwanda economy OR Rwanda business OR Rwanda markets",

  Ethiopia:
    "Ethiopia economy OR Ethiopia business OR Ethiopia markets",
};

// ============================================================
// HELPER: CLEAN HTML
// ============================================================

function cleanText(text = "") {
  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// GOOGLE NEWS RSS
// ============================================================

async function fetchGoogleNews(
  country
) {
  const query =
    newsQueries[country] ||
    newsQueries.Kenya;

  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=en-KE&gl=KE&ceid=KE:en`;

  try {
    console.log(
      `Fetching Google News for ${country}`
    );

    const response =
      await axios.get(url, {
        timeout: 15000,

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

          Accept:
            "application/rss+xml, application/xml, text/xml",
        },
      });

    const parser =
      new xml2js.Parser({
        explicitArray: false,
        trim: true,
      });

    const result =
      await parser.parseStringPromise(
        response.data
      );

    const items =
      result?.rss?.channel?.item ||
      [];

    const itemArray =
      Array.isArray(items)
        ? items
        : [items];

    const articles = itemArray
      .filter(Boolean)
      .map((item) => {
        const title = cleanText(
          item.title || ""
        );

        const description =
          cleanText(
            item.description || ""
          );

        let link =
          item.link || "";

        if (
          typeof link === "object"
        ) {
          link =
            link._ ||
            link.href ||
            "";
        }

        return {
          title,

          description:
            description.length > 180
              ? `${description.slice(
                  0,
                  180
                )}...`
              : description,

          url: link,

          publishedAt:
            item.pubDate ||
            item.pubdate ||
            "",
        };
      })
      .filter(
        (article) =>
          article.title &&
          article.url
      );

    console.log(
      `Found ${articles.length} articles for ${country}`
    );

    return articles;
  } catch (error) {
    console.error(
      `Google News error for ${country}:`,
      error.response?.data ||
        error.message
    );

    return [];
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",

      service:
        "NexusEconomics API",

      timestamp:
        new Date().toISOString(),

      payments:
        PAYSTACK_SECRET_KEY
          ? "Paystack configured"
          : "Paystack not configured",
    });
  }
);

// ============================================================
// INFLATION API
// ============================================================

app.get(
  "/api/inflation/:country",
  (req, res) => {
    const country =
      req.params.country;

    const data =
      countryInflation[country];

    if (!data) {
      return res
        .status(404)
        .json({
          error:
            "Country not found",
        });
    }

    const observations =
      data.trend.map(
        (value, index) => ({
          date: months[index],
          value:
            value.toString(),
        })
      );

    res.json({
      observations,
      latestRate:
        data.rate,
    });
  }
);

// ============================================================
// EXCHANGE RATE API
// ============================================================

app.get(
  "/api/exchange",
  async (req, res) => {
    try {
      if (!EXCHANGE_API_KEY) {
        return res
          .status(500)
          .json({
            error:
              "EXCHANGE_API_KEY is not configured",
          });
      }

      const response =
        await axios.get(
          `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`,
          {
            timeout: 10000,
          }
        );

      return res.json(
        response.data
      );
    } catch (error) {
      console.error(
        "Exchange API error:",
        error.response?.data ||
          error.message
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch exchange rate data",
        });
    }
  }
);

// ============================================================
// NEWS API
// ============================================================

app.get(
  "/api/news",
  async (req, res) => {
    try {
      const country =
        req.query.country ||
        "Kenya";

      const articles =
        await fetchGoogleNews(
          country
        );

      return res.json({
        country,
        articles:
          articles.slice(0, 8),
      });
    } catch (error) {
      console.error(
        "News API error:",
        error.message
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to fetch news",
          articles: [],
        });
    }
  }
);

// ============================================================
// AI ECONOMIC REPORT
// ============================================================

app.post(
  "/api/report",
  async (req, res) => {
    try {
      const {
        inflation,
        exchangeKES,
        exchangeUGX,
        exchangeRate,
        gdpGrowth,
        unemployment,
        country,
      } = req.body;

      if (!CLAUDE_API_KEY) {
        return res
          .status(500)
          .json({
            error:
              "CLAUDE_API_KEY is not configured",
          });
      }

      const prompt = `
You are a senior economist at a leading African financial institution.

Write a concise, data-driven economic intelligence brief for ${
        country || "the selected country"
      }.

Use only the indicators supplied below.

Inflation Rate: ${
        inflation ?? "Not provided"
      }%

GDP Growth: ${
        gdpGrowth ?? "Not provided"
      }%

Unemployment Rate: ${
        unemployment ??
        "Not provided"
      }%

Exchange Rate: ${
        exchangeRate ||
        "Not provided"
      }

USD/KES Exchange Rate: ${
        exchangeKES ||
        "Not provided"
      }

USD/UGX Exchange Rate: ${
        exchangeUGX ||
        "Not provided"
      }

Write exactly 3 paragraphs.

Paragraph 1 — Current situation:
Interpret what these specific numbers mean for the economy right now. Mention the supplied figures.

Paragraph 2 — Risks and opportunities:
Discuss key economic risks and opportunities for trade, investment, employment and growth.

Paragraph 3 — Outlook and recommendations:
Give a short-term economic outlook and practical recommendations for policymakers, investors and businesses.

Use professional economic language.

Do not use bullet points.

Do not invent statistics that were not provided.
`;

      const response =
        await axios.post(
          "https://api.anthropic.com/v1/messages",

          {
            model:
              "claude-haiku-4-5-20251001",

            max_tokens: 1200,

            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          },

          {
            timeout: 30000,

            headers: {
              "Content-Type":
                "application/json",

              "x-api-key":
                CLAUDE_API_KEY,

              "anthropic-version":
                "2023-06-01",
            },
          }
        );

      const report =
        response.data
          ?.content?.[0]
          ?.text ||
        "No report was generated.";

      return res.json({
        report,
      });
    } catch (error) {
      console.error(
        "Claude API error:",
        error.response?.data ||
          error.message
      );

      return res
        .status(500)
        .json({
          error:
            error.response?.data
              ?.error?.message ||
            "Failed to generate economic report",
        });
    }
  }
);

// ============================================================
// PAYSTACK — PLAN INFORMATION
// ============================================================

app.get(
  "/api/payment/plan",
  (req, res) => {
    res.json({
      name:
        "NexusEconomics Premium",

      price:
        PREMIUM_PRICE_KES,

      amount:
        PREMIUM_AMOUNT,

      currency: "KES",

      duration:
        "30 days",

      paymentMethod:
        "Paystack",

      configured:
        Boolean(
          PAYSTACK_SECRET_KEY
        ),

      features: [
        "AI Economic Reports",
        "PDF Economic Reports",
        "Advanced Economic Analytics",
        "Premium Market Intelligence",
        "Priority access to new features",
      ],
    });
  }
);

// ============================================================
// PAYSTACK — INITIALIZE PAYMENT
// ============================================================

app.post(
  "/api/payment/initialize",
  async (req, res) => {
    try {
      if (
        !PAYSTACK_SECRET_KEY
      ) {
        return res
          .status(500)
          .json({
            error:
              "PAYSTACK_SECRET_KEY is not configured",
          });
      }

      const {
        email,
        plan = "premium",
      } = req.body || {};

      if (
        !email ||
        typeof email !== "string"
      ) {
        return res
          .status(400)
          .json({
            error:
              "Email address is required",
          });
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailPattern.test(
          cleanEmail
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Please enter a valid email address",
          });
      }

      if (
        plan !== "premium"
      ) {
        return res
          .status(400)
          .json({
            error:
              "Invalid Premium plan",
          });
      }

      const reference =
        `NEXUS-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;

      const callbackUrl =
        `${FRONTEND_URL}/?payment=success&reference=${encodeURIComponent(
          reference
        )}`;

      console.log(
        "Initializing Paystack payment:",
        {
          email: cleanEmail,
          amount:
            PREMIUM_AMOUNT,
          currency: "KES",
          reference,
        }
      );

      const response =
        await axios.post(
          "https://api.paystack.co/transaction/initialize",

          {
            email:
              cleanEmail,

            amount:
              PREMIUM_AMOUNT,

            currency:
              "KES",

            reference,

            callback_url:
              callbackUrl,

            metadata: {
              product:
                "NexusEconomics Premium",

              plan:
                "premium",

              priceKES:
                PREMIUM_PRICE_KES,

              accessDurationDays:
                30,
            },
          },

          {
            headers: {
              Authorization:
                `Bearer ${PAYSTACK_SECRET_KEY}`,

              "Content-Type":
                "application/json",
            },

            timeout: 30000,
          }
        );

      const paystackData =
        response.data?.data;

      if (
        !response.data?.status ||
        !paystackData
          ?.authorization_url
      ) {
        console.error(
          "Unexpected Paystack initialization response:",
          response.data
        );

        return res
          .status(502)
          .json({
            error:
              "Paystack could not initialize the payment",
          });
      }

      return res.json({
        status: true,

        message:
          "Payment initialized successfully",

        authorization_url:
          paystackData
            .authorization_url,

        access_code:
          paystackData
            .access_code,

        reference:
          paystackData
            .reference,
      });
    } catch (error) {
      console.error(
        "Paystack initialization error:",
        error.response?.data ||
          error.message
      );

      return res
        .status(
          error.response?.status ||
            500
        )
        .json({
          error:
            error.response?.data
              ?.message ||
            "Failed to initialize payment",
        });
    }
  }
);

// ============================================================
// PAYSTACK — VERIFY PAYMENT
// ============================================================

app.get(
  "/api/payment/verify/:reference",
  async (req, res) => {
    try {
      if (
        !PAYSTACK_SECRET_KEY
      ) {
        return res
          .status(500)
          .json({
            error:
              "PAYSTACK_SECRET_KEY is not configured",
          });
      }

      const reference =
        req.params.reference;

      if (!reference) {
        return res
          .status(400)
          .json({
            error:
              "Payment reference is required",
          });
      }

      const response =
        await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(
            reference
          )}`,

          {
            headers: {
              Authorization:
                `Bearer ${PAYSTACK_SECRET_KEY}`,

              "Content-Type":
                "application/json",
            },

            timeout: 30000,
          }
        );

      const payment =
        response.data?.data;

      if (!payment) {
        return res
          .status(404)
          .json({
            error:
              "Payment transaction not found",
          });
      }

      const paymentSuccessful =
        payment.status ===
        "success";

      const correctAmount =
        Number(payment.amount) ===
        PREMIUM_AMOUNT;

      const correctCurrency =
        payment.currency ===
        "KES";

      const premium =
        paymentSuccessful &&
        correctAmount &&
        correctCurrency;

      console.log(
        "Paystack verification:",
        {
          reference:
            payment.reference,
          status:
            payment.status,
          amount:
            payment.amount,
          currency:
            payment.currency,
          premium,
        }
      );

      return res.json({
        success:
          paymentSuccessful,

        premium,

        status:
          payment.status,

        reference:
          payment.reference,

        amount:
          payment.amount,

        amountKES:
          Number(
            payment.amount
          ) / 100,

        currency:
          payment.currency,

        email:
          payment.customer
            ?.email ||
          null,

        paidAt:
          payment.paid_at ||
          null,

        gatewayResponse:
          payment.gateway_response ||
          null,
      });
    } catch (error) {
      console.error(
        "Paystack verification error:",
        error.response?.data ||
          error.message
      );

      return res
        .status(
          error.response?.status ||
            500
        )
        .json({
          error:
            error.response?.data
              ?.message ||
            "Failed to verify payment",
        });
    }
  }
);

// ============================================================
// REACT FRONTEND FALLBACK
// ============================================================
//
// Do not use app.get("*") with the Express version
// you were having trouble with.
// ============================================================

app.use(
  (req, res, next) => {
    if (
      req.method === "GET" &&
      !req.path.startsWith(
        "/api/"
      )
    ) {
      return res.sendFile(
        path.join(
          frontendPath,
          "index.html"
        )
      );
    }

    next();
  }
);

// ============================================================
// 404 API HANDLER
// ============================================================

app.use(
  (req, res) => {
    res.status(404).json({
      error:
        "Endpoint not found",

      path:
        req.originalUrl,
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `NexusEconomics server running on port ${PORT}`
    );

    console.log(
      `Frontend URL: ${FRONTEND_URL}`
    );

    console.log(
      `Paystack: ${
        PAYSTACK_SECRET_KEY
          ? "CONFIGURED"
          : "NOT CONFIGURED"
      }`
    );
  }
);