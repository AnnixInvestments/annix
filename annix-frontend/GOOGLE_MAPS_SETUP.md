# Google Maps Setup Guide

## 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API** 
   - **Geocoding API**

4. Create credentials:
   - Go to "Credentials" → "Create Credentials" → "API key"
   - Restrict the API key for security:
     - Application restrictions: HTTP referrers (add your domain)
     - API restrictions: Only enable the three APIs listed above

## 2. Environment Setup

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your API key:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

## 3. Choose Your Implementation

You now have two options:

### Option A: Enhanced React Component (`GoogleMapLocationPicker.tsx`)
- Uses `@react-google-maps/api` (already installed)
- Added Places Autocomplete functionality
- Fully React-based implementation
- More control over styling and behavior

### Option B: Extended Component Library (`GoogleMapsExtendedPicker.tsx`)
- Uses Google's Web Components
- Follows the exact code pattern you provided
- More "Google-like" implementation
- Requires loading external Web Components

## 4. Update Your Form Component

To use the new extended component, update your RFQ form:

```tsx
// In MultiStepStraightPipeRfqForm.tsx
import GoogleMapsExtendedPicker from '@/app/components/GoogleMapsExtendedPicker';

// Replace the GoogleMapLocationPicker usage:
{showMapPicker && (
  <GoogleMapsExtendedPicker
    apiKey={GOOGLE_MAPS_API_KEY}
    initialLocation={
      rfqData.latitude && rfqData.longitude
        ? { lat: rfqData.latitude, lng: rfqData.longitude }
        : undefined
    }
    onLocationSelect={handleLocationSelect}
    onClose={() => setShowMapPicker(false)}
  />
)}
```

## 5. Test the Implementation

1. Restart your development server:
```bash
npm run dev
```

2. Navigate to the RFQ form and test the location picker

## 6. Troubleshooting

### Common Issues:

1. **API Key Errors**:
   - Ensure all three APIs are enabled
   - Check API key restrictions
   - Verify the API key is properly set in `.env.local`

2. **Loading Errors**:
   - Check browser console for specific error messages
   - Ensure you have a stable internet connection
   - Verify the API key has sufficient quota

3. **Place Autocomplete Not Working**:
   - Ensure Places API is enabled
   - Check for network connectivity issues
   - Verify API key permissions

### Debug Steps:

1. Open browser dev tools and check the Console tab
2. Look for Google Maps related errors
3. Verify the API key is being loaded (check Network tab)
4. Test with a simple Google Maps embed first to isolate issues

## 7. Security Best Practices

- Always restrict your API key
- Use different keys for development and production
- Monitor your API usage in the Google Cloud Console
- Set up alerts for unusual usage patterns