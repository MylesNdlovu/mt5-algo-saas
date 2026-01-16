# ForexVPS Custom Server Quote Request

## Email Template

**To:** sales@forexvps.net
**Subject:** Custom Dedicated Server Quote - 45-50 MT5 Terminals

---

**Email Body:**

```
Hi ForexVPS Team,

I'm setting up a trading infrastructure for 45-50 MT5 terminals running
24/7 with the following architecture:

- Scalperium web monitoring platform
- C# Pool Agent (mother agent)
- 1 Master EA + 44 Slave terminals with trade copier
- Custom indicators on all terminals
- Galaxy Gold Scalper EA (C++ DLL)

REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Essential Specs:
- CPU: 10-12 cores minimum (Intel Xeon E5 series or newer)
- RAM: 128GB DDR4
- Storage: 1TB SSD (NVMe preferred)
- Network: Low latency to major brokers (Exness, IC Markets, FTMO)
- OS: Windows Server 2019 or 2022
- GPU: NOT needed (please don't include - trying to optimize cost)

Preferred Locations (in order):
1. New York (for US broker access)
2. London (for EU broker access)
3. Amsterdam (backup option)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUESTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Do you have 10-12 core Xeon dedicated servers available?
   (I see 6-8 core options on website, but need more for my use case)

2. What's the monthly cost for:
   - 10 core / 128GB configuration?
   - 12 core / 128GB configuration?

3. What latency can I expect to:
   - Exness servers (New York)
   - IC Markets servers
   - FTMO servers

4. Do you offer:
   - Automatic daily backups? (cost?)
   - DDoS protection included?
   - 24/7 support?

5. Can I test the server for 1-3 days before committing to monthly?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BACKGROUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I initially looked at your GPU server (Intel E-2288G, 8 cores), but:
- 8 cores is insufficient for 45-50 terminals
- GPU provides no benefit for MT5 trading
- Looking for better CPU allocation without GPU premium

I'm ready to order immediately once I receive the quote.

Budget: ~$400-500/month

Thank you,
[Your Name]
[Your Contact Info]
```

---

## Expected Response

ForexVPS should provide:
1. Available configurations with 10-12+ cores
2. Monthly pricing for each tier
3. Latency estimates
4. Setup timeline (usually 2-4 hours)

## If They Say "Only 8 cores available":

**Plan B Options:**
1. Ask for dual-CPU configuration (2 × 6 cores = 12 cores total)
2. Consider their "Dual E5-2680v2" if available ($599/mo but 20 cores)
3. Look at alternative providers:
   - **Hetzner:** Dedicated servers with 12-16 cores
   - **OVH:** Bare metal with Xeon configurations
   - **Vultr:** High-frequency compute instances
   - **Contabo:** Budget dedicated servers

---

## Decision Tree

```
Did laptop testing work?
  ├─ YES → Order server
  │   └─ Got 10+ core quote?
  │       ├─ YES ($400-500/mo) → ✅ BUY IT
  │       ├─ YES ($500-600/mo) → ⚠️ Consider if worth it
  │       └─ NO (only 8 cores) → Try Plan B providers
  │
  └─ NO → Fix architecture issues first
      └─ Don't order server until confirmed working
```

---

## Alternative Providers (If ForexVPS Can't Deliver)

### Hetzner (Germany-based, excellent value)
- **Website:** https://www.hetzner.com/dedicated-rootserver
- **Example:** AX102 - AMD Ryzen 9 5950X (16 cores), 128GB RAM
- **Price:** ~€150/month (~$165 USD)
- **Pros:** Much cheaper, more cores
- **Cons:** Germany-based (higher latency to US brokers)

### OVH (Multiple locations)
- **Website:** https://www.ovhcloud.com/en/bare-metal/
- **Example:** Rise-4 - Intel Xeon-D 2141I (8 cores), 64GB RAM
- **Price:** ~$150-200/month
- **Locations:** US, EU, Asia

### Vultr (High-frequency compute)
- **Website:** https://www.vultr.com/pricing/#bare-metal
- **Example:** Bare Metal - Intel E-2388G (8 cores), 128GB RAM
- **Price:** ~$450/month
- **Pros:** Low latency, fast setup
- **Cons:** Similar core count to ForexVPS GPU server

---

## Cost Summary

| Provider | Cores | RAM | Price | Cost per Terminal (45) |
|----------|-------|-----|-------|----------------------|
| **ForexVPS (10-12 cores)** | 10-12 | 128GB | $400-500 | $9-11 ✅ BEST |
| **ForexVPS GPU** | 8 | 128GB | $650+ | $18 ❌ Bad value |
| **Hetzner** | 16 | 128GB | $165 | $3.67 ⭐ Cheapest |
| **OVH** | 8 | 64GB | $200 | $4.44 ✅ Budget |
| **Vultr** | 8 | 128GB | $450 | $10 ✅ Good |

---

## Next Steps

1. ✅ Use this email template to contact ForexVPS
2. ✅ Test on laptop while waiting for quote (don't skip this!)
3. ✅ Compare quotes from 2-3 providers
4. ✅ Choose best value for your needs
5. ✅ Deploy to production

Good luck!
