# Google Maps Error Troubleshooting

## 🚨 Common Google Maps Errors & Fixes

### 1. **API Key Issues**
**Error**: "API key not found" or "forbidden"
**Fix**:
- Check `.env.local` exists and contains valid API key
- Ensure Maps JavaScript API, Places API, and Geocoding API are enabled
- Verify API key restrictions allow your domain/localhost

### 2. **Library Loading Issues**
**Error**: "google is not defined" or "places is not defined"
**Fix**:
- Ensure `places` library is included in loader
- Check network connection
- Clear browser cache and reload

### 3. **Geolocation Errors**
**Error**: "Location access denied" or "Unable to get location"
**Fix**:
- Enable location services in browser
- Click location icon in address bar to allow access
- Use HTTPS (localhost should work)

### 4. **Layout/UI Issues**
**Error**: Map not rendering or buttons out of view
**Fix**:
- Refresh browser
- Check browser console for errors
- Ensure responsive design is working

## 🔧 Quick Setup Commands

```bash
# Create .env.local if not exists
cp .env.local.example .env.local

# Add your API key
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key_here" > .env.local

# Restart dev server
npm run dev
```

## 🧪 Test Steps

1. Open RFQ form
2. Click "Add Location" button
3. Check if map loads without errors
4. Test search autocomplete
5. Test map click functionality
6. Test "Use My Location" button
7. Confirm location and verify form updates

## 📱 Browser Console Debugging

Open Developer Tools (F12) and check:
- **Console**: Look for Google Maps errors
- **Network**: Check if Maps API loads successfully
- **Elements**: Verify map container has dimensions

## 🆘 Still Getting Errors?

1. **Reload Page**: Sometimes a simple reload fixes loading issues
2. **Clear Cache**: Clear browser cache and localStorage
3. **Check API Key**: Use Google Cloud Console to verify key is active
4. **Incognito Mode**: Test in incognito to rule out extensions
5. **Different Browser**: Try Chrome, Firefox, or Edge

## 📞 Support

If issues persist:
- Check browser console for specific error messages
- Verify API key has proper permissions
- Ensure all required Google Maps APIs are enabled
- Test with a simple Google Maps embed first