# 🚀 Ghid Pornire ERP Shopify cu Cloudflare Tunnel

## 📋 Informații Conturi

| Serviciu | Email / Cont | Observații |
|----------|--------------|------------|
| **Cloudflare** | stef.bbc6534@gmail.com | Aici e configurat tunelul |
| **Squarespace** (domeniu) | andrei@cashflowgrup.net | Domeniul cashflowgrup.net |

---

## 🌐 URL Aplicație

```
https://erp.cashflowgrup.net
```

---

## ▶️ Pornire Aplicație (2 terminale necesare)

### Terminal 1 - Pornește Next.js:

```bash
cd ~/Downloads/erp-shopify\ 3
npm run dev
```

Așteaptă să vezi:
```
✓ Ready in 2.5s
➜ Local: http://localhost:3000
```

### Terminal 2 - Pornește Cloudflare Tunnel:

```bash
cloudflared tunnel run erp-tunnel
```

Așteaptă să vezi:
```
INF Registered tunnel connection connIndex=0 ...
INF Registered tunnel connection connIndex=1 ...
```

### ✅ Gata!

Deschide în browser: `https://erp.cashflowgrup.net`

---

## ⏹️ Oprire Aplicație

În fiecare terminal apasă: `Ctrl + C`

---

## 🔧 Troubleshooting

### Site-ul nu se încarcă / timeout

**1. Verifică dacă aplicația rulează:**
```bash
curl -I http://localhost:3000
```
Ar trebui să vezi `HTTP/1.1 307 Temporary Redirect`

**2. Verifică dacă tunelul rulează:**
```bash
cloudflared tunnel list
```
Ar trebui să vezi `erp-tunnel` cu CONNECTIONS active

**3. DNS cache - dacă vezi IP-uri greșite (86.35.x.x):**
```bash
# Curăță cache-ul DNS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Verifică DNS-ul
nslookup erp.cashflowgrup.net 8.8.8.8
```
Ar trebui să vezi IP-uri Cloudflare (104.21.x.x sau 172.67.x.x)

**4. Schimbă DNS-ul pe Mac (dacă tot nu merge):**
```bash
networksetup -setdnsservers Wi-Fi 1.1.1.1 8.8.8.8
```

---

## 📁 Fișiere Configurare Cloudflare

Locație: `~/.cloudflared/`

```
~/.cloudflared/
├── config.yml                                    # Configurare tunnel
└── 22eefff1-9e9a-4dea-9370-522d1d2b0e22.json    # Credențiale tunnel
```

### Conținut config.yml:

```yaml
tunnel: erp-tunnel
credentials-file: /Users/stefanpanaite/.cloudflared/22eefff1-9e9a-4dea-9370-522d1d2b0e22.json
protocol: http2

ingress:
  - hostname: erp.cashflowgrup.net
    service: http://localhost:3000
  - service: http_status:404
```

---

## 🔄 Comenzi Utile

| Comandă | Descriere |
|---------|-----------|
| `cloudflared tunnel list` | Vezi tunelele existente |
| `cloudflared tunnel info erp-tunnel` | Detalii despre tunel |
| `cloudflared tunnel route dns erp-tunnel erp.cashflowgrup.net` | Adaugă rută DNS |
| `cloudflared tunnel run erp-tunnel` | Pornește tunelul |

---

## ⚠️ Important

- **Laptopul trebuie să fie pornit** pentru ca site-ul să funcționeze
- **Ambele terminale** trebuie să rămână deschise (Next.js + Cloudflare Tunnel)
- Dacă închizi laptopul sau oprești terminalele, site-ul devine inaccesibil
- Pentru soluție permanentă, consideră hosting pe VPS (Hetzner, DigitalOcean, etc.)

---

## 📞 Suport

Dacă ai probleme cu:
- **Tunelul Cloudflare** → Dashboard: https://dash.cloudflare.com (stef.bbc6534@gmail.com)
- **Domeniul** → Squarespace: https://squarespace.com (andrei@cashflowgrup.net)
- **Aplicația** → Verifică logurile în terminalul unde rulează `npm run dev`

---

*Ultima actualizare: 2 Ianuarie 2026*
