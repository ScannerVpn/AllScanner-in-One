# Express Scanner - Server API Documentation

## ✅ Status
- **Total Servers**: 143 active ExpressVPN servers
- **API Source**: ExpressVPN Live (from Zomboided/service.vpn.manager.providers)
- **Server List**: Successfully extracted and verified
- **Last Updated**: 2026-06-06

## 📍 Available Endpoints

### 1. Get All Servers
```
GET /api/servers
```
Returns list of all available ExpressVPN servers with countries and cities.

**Response Example:**
```json
{
  "servers": [
    {"hostname": "albania-ca-version-2.expressnetw.com", "country": "Albania", "city": "Albania", "code": "AL"},
    ...
  ],
  "count": 143,
  "source": "expressvpn-live"
}
```

### 2. Test Server Connectivity (Ping/Probe)
```
GET /api/ping?host=HOSTNAME
```
Tests if a server is accessible. Supports multiple connection methods:
- **TLS/443**: Direct HTTPS connection test
- **TCP/443**: TCP SYN handshake test  
- **ICMP**: ICMP ping (fallback)

**Example:**
```
GET /api/ping?host=albania-ca-version-2.expressnetw.com
```

**Response:**
```json
{
  "host": "albania-ca-version-2.expressnetw.com",
  "ms": null,
  "method": null,
  "vpnAccessible": false,
  "ip": null
}
```

### 3. Export Servers
```
GET /api/export?format=json
GET /api/export?format=csv
```
Export server list in JSON or CSV format.

**JSON Format:**
```json
{"servers": [...], "count": 143, "source": "expressvpn-live"}
```

**CSV Format:**
```
hostname,country,city,code
albania-ca-version-2.expressnetw.com,Albania,Albania,AL
```

### 4. Server Status
```
GET /api/data/status
```
Get current dataset information.

## 🌍 Server Distribution

| Region | Count |
|--------|-------|
| USA | 23 |
| Europe | ~50 |
| Asia | ~30 |
| Oceania | 5 |
| Americas | ~20 |
| Middle East/Africa | ~15 |

## 🔧 DNS & Connectivity Improvements

### Recent Fixes (2026-06-06)
1. **Multi-Provider DoH Support**
   - Primary: Cloudflare (1.1.1.1)
   - Fallback: Google (8.8.8.8)  
   - Fallback: Quad9 (1.0.0.1)

2. **Private IP Detection**
   - Filters out ISP DNS poisoning attempts
   - Rejects 10.x.x.x, 172.x.x.x, 192.168.x.x

3. **Enhanced Probe Methods**
   - TLS handshake detection
   - TCP connection testing
   - ICMP ping fallback

## 📊 Countries Available

All major countries including:
- **Albania, Algeria, Andorra, Argentina, Armenia, Australia, Austria**
- **Brazil, Canada, Chile, Colombia, Denmark, Egypt, Finland, France**
- **Germany, Greece, Hong Kong, India, Indonesia, Ireland, Israel, Italy**
- **Japan, Mexico, Netherlands, Norway, Pakistan, Singapore, Spain, Sweden**
- **Switzerland, Thailand, Turkey, UK, Ukraine, USA, Vietnam**
- ...and 70+ more countries

## 💾 Extracted Files

- `extracted_servers.json` - Full server list (143 servers)
- `servers-info.txt` - Server distribution statistics
- `SERVERS_API.md` - This documentation

## 🚀 Usage Example

```bash
# Get all servers
curl http://localhost:3003/api/servers | jq '.servers | length'

# Test a specific server
curl http://localhost:3003/api/ping?host=albania-ca-version-2.expressnetw.com

# Export as CSV
curl http://localhost:3003/api/export?format=csv > servers.csv
```

## ⚠️ Notes

- DNS resolution uses system DNS with DoH fallbacks for areas with DNS filtering
- Some servers may show as unreachable due to network restrictions or ISP blocks
- Probe results depend on local network conditions
- From Iran/restricted regions, use with appropriate routing

