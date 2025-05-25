# Scrape Data Integration API

## 🚀 Quick Start for UI Development

### Mock Data Mode (Recommended for UI Development)

Set environment variable to use mock data instead of real API calls:

```bash
export USE_MOCK_DATA=true
```

Or add to your `.env` file:
```
USE_MOCK_DATA=true
```

### Benefits of Mock Mode:
- ⚡ **Instant responses** - No API delays
- 💰 **No API costs** - Save on Bright Data usage
- 🔄 **Consistent data** - Same data every time
- 🛠️ **Offline development** - Work without internet

## 📁 File Structure

```
scrape-data-integration/
├── index.ts           # Main API routes
├── libs/
│   ├── types.ts       # TypeScript interfaces
│   ├── helper.ts      # API & transformation functions
│   └── mock-data.ts   # Mock data for development
└── README.md
```

## 🎭 Mock Data Available

### LinkedIn Profile Mock Data:
- Complete profile with posts, education, experience
- Realistic data structure matching API response
- Multiple posts and activities for testing

### LinkedIn Company Mock Data:
- Company info with funding details
- Employee count and locations
- Realistic business data

## 🔄 Switching Modes

### Development Mode (Mock Data):
```bash
export USE_MOCK_DATA=true
```

### Production Mode (Real API):
```bash
export USE_MOCK_DATA=false
# or simply unset the variable
unset USE_MOCK_DATA
```

## 📝 API Endpoints

### LinkedIn Profile
```bash
POST /scrape-data-integration/linkedin-profile
Body: { "url": "any-linkedin-profile-url" }
```

### LinkedIn Company
```bash
POST /scrape-data-integration/linkedin-company-profile  
Body: { "url": "any-linkedin-company-url" }
```

## 💡 Development Tips

1. **Start with mock data** for UI development
2. **Switch to real API** only when testing actual scraping
3. **Customize mock data** in `libs/mock-data.ts` for your needs
4. **Check console logs** - mock mode shows 🎭 emoji

## 🛠️ Customizing Mock Data

Edit `libs/mock-data.ts` to modify the mock responses:

```typescript
export const mockLinkedInProfile: LinkedInProfile = {
  name: "Your Custom Name",
  // ... customize as needed
}
``` 