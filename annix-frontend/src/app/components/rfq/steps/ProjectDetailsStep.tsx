'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { minesApi, SaMine } from '@/app/lib/api/client';
import { generateSystemReferenceNumber } from '@/app/lib/utils/systemUtils';
import GoogleMapLocationPicker from '@/app/components/GoogleMapLocationPicker';
import { useEnvironmentalIntelligence } from '@/app/lib/hooks/useEnvironmentalIntelligence';
import RfqDocumentUpload from '@/app/components/rfq/RfqDocumentUpload';
import { AutoFilledInput, AutoFilledSelect, AutoFilledDisplay } from '@/app/components/rfq/AutoFilledField';
import AddMineModal from '@/app/components/rfq/AddMineModal';
import { useCustomerAuth } from '@/app/context/CustomerAuthContext';
import { PRODUCTS_AND_SERVICES } from '@/app/lib/config/productsServices';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface PendingDocument {
  file: File;
  id: string;
}

interface ProjectDetailsStepProps {
  rfqData: any;
  onUpdate: (field: string, value: any) => void;
  errors: Record<string, string>;
  globalSpecs: any;
  onUpdateGlobalSpecs: (specs: any) => void;
  pendingDocuments: PendingDocument[];
  onAddDocument: (file: File) => void;
  onRemoveDocument: (id: string) => void;
}

export default function ProjectDetailsStep({ rfqData, onUpdate, errors, globalSpecs, onUpdateGlobalSpecs, pendingDocuments, onAddDocument, onRemoveDocument }: ProjectDetailsStepProps) {
  const [additionalNotes, setAdditionalNotes] = useState<string[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const hasProjectTypeError = Boolean(errors.projectType);

  const getMapConfig = () => typeof window !== 'undefined' && window.innerWidth < 768 ? 'responsive' : 'default';

  // Document upload confirmation state
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [showNoDocumentsPopup, setShowNoDocumentsPopup] = useState(false);

  // SA Mines state
  const [mines, setMines] = useState<SaMine[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<number | null>(null);
  const [isLoadingMines, setIsLoadingMines] = useState(false);
  const [mineDataLoading, setMineDataLoading] = useState(false);
  const [showAddMineModal, setShowAddMineModal] = useState(false);

  // Track which location fields were auto-filled from the map picker
  const [locationAutoFilled, setLocationAutoFilled] = useState<{
    latitude: boolean;
    longitude: boolean;
    siteAddress: boolean;
    region: boolean;
    country: boolean;
  }>({
    latitude: false,
    longitude: false,
    siteAddress: false,
    region: false,
    country: false,
  });

  // Section confirmation state - for locking data after user confirms
  const [projectTypeConfirmed, setProjectTypeConfirmed] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [environmentalConfirmed, setEnvironmentalConfirmed] = useState(false);

  // Edit mode state - for unlocking confirmed sections
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingEnvironmental, setIsEditingEnvironmental] = useState(false);

  // Environmental intelligence auto-fill
  const {
    isLoading: isLoadingEnvironmental,
    errors: environmentalErrors,
    autoFilledFields,
    metadata: environmentalMetadata,
    fetchAndApply: fetchEnvironmentalData,
    wasAutoFilled,
    markAsOverridden,
    markFieldsAsAutoFilled,
  } = useEnvironmentalIntelligence();

  const handleLocationSelect = async (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string }
  ) => {
    // Update location fields and mark as auto-filled
    onUpdate("latitude", location.lat);
    onUpdate("longitude", location.lng);

    // Track which fields are being auto-filled
    const newAutoFilled = {
      latitude: true,
      longitude: true,
      siteAddress: false,
      region: false,
      country: false,
    };

    if (addressComponents) {
      if (addressComponents.address) {
        onUpdate("siteAddress", addressComponents.address);
        newAutoFilled.siteAddress = true;
      }
      if (addressComponents.region) {
        onUpdate("region", addressComponents.region);
        newAutoFilled.region = true;
      }
      if (addressComponents.country) {
        onUpdate("country", addressComponents.country);
        newAutoFilled.country = true;
      }
    }

    setLocationAutoFilled(newAutoFilled);
    setShowMapPicker(false);

    // Fetch environmental data and auto-fill fields
    if (onUpdateGlobalSpecs) {
      try {
        console.log('[Form] Fetching environmental data for:', location);
        const environmentalData = await fetchEnvironmentalData(
          location.lat,
          location.lng,
          addressComponents?.region,
          addressComponents?.country
        );

        console.log('[Form] Environmental data received:', environmentalData);
        console.log('[Form] Current globalSpecs:', globalSpecs);

        // Update globalSpecs with environmental data
        const updatedSpecs = {
          ...globalSpecs,
          ...environmentalData,
        };
        console.log('[Form] Updated globalSpecs:', updatedSpecs);
        onUpdateGlobalSpecs(updatedSpecs);
      } catch (error) {
        // Silently handle - user can still fill in manually
        if (error instanceof Error && error.message !== 'Backend unavailable') {
          console.error('Failed to fetch environmental data:', error);
        }
      }
    }
  };

  const commonNotes = [
    "All pipes to be hydrostatically tested before delivery",
    "Material certificates required (EN 10204 3.1)",
    "Pipes to be supplied with protective end caps",
    "Delivery required to site in South Africa",
    "All flanges to be raised face (RF) unless specified",
    "Pipes to comply with SABS/SANS standards",
    "Mill test certificates required for all items",
    "Surface preparation: Shot blast to SA2.5 standard",
    "Urgent delivery required - please expedite",
    "Client inspection required before dispatch"
  ];

  // Fallback mines data when API is unavailable - Complete list of SA mines (alphabetical order)
  const fallbackMines: SaMine[] = [
    { id: 18, mineName: 'Amandelbult Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Thabazimbi, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -24.8167, longitude: 27.3667 },
    { id: 23, mineName: 'Bathopele Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Rustenburg, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6333, longitude: 27.3000 },
    { id: 14, mineName: 'Beatrix Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 2, commodityName: 'Gold', province: 'Free State', district: 'Lejweleputswa', physicalAddress: 'Welkom, Free State', mineType: 'Underground', operationalStatus: 'Active', latitude: -28.0000, longitude: 26.7500 },
    { id: 29, mineName: 'Beeshoek Mine', operatingCompany: 'Assmang', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'Siyanda', physicalAddress: 'Postmasburg, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -28.4333, longitude: 23.1500 },
    { id: 32, mineName: 'Black Mountain Mine', operatingCompany: 'Vedanta Zinc', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Northern Cape', district: 'Namakwa', physicalAddress: 'Aggeneys, Northern Cape', mineType: 'Underground', operationalStatus: 'Active', latitude: -29.2333, longitude: 18.8167 },
    { id: 38, mineName: 'Cullinan Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Gauteng', district: 'Tshwane', physicalAddress: 'Cullinan, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6833, longitude: 28.5167 },
    { id: 15, mineName: 'Driefontein Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Carletonville, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.3833, longitude: 27.5167 },
    { id: 37, mineName: 'Finsch Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Northern Cape', district: 'Frances Baard', physicalAddress: 'Lime Acres, Northern Cape', mineType: 'Underground', operationalStatus: 'Active', latitude: -28.3833, longitude: 23.4500 },
    { id: 33, mineName: 'Gamsberg Mine', operatingCompany: 'Vedanta Zinc', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Northern Cape', district: 'Namakwa', physicalAddress: 'Aggeneys, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -29.2500, longitude: 18.9333 },
    { id: 3, mineName: 'Goedehoop Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Middelburg, Mpumalanga', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.7700, longitude: 29.4700 },
    { id: 4, mineName: 'Greenside Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Witbank, Mpumalanga', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.8900, longitude: 29.1600 },
    { id: 6, mineName: 'Grootegeluk Mine', operatingCompany: 'Exxaro', commodityId: 1, commodityName: 'Coal', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Lephalale, Limpopo', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -23.6500, longitude: 27.7000 },
    { id: 20, mineName: 'Impala Rustenburg', operatingCompany: 'Impala Platinum', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Rustenburg, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6667, longitude: 27.2500 },
    { id: 1, mineName: 'Isibonelo Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Ogies, Mpumalanga', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -26.0167, longitude: 29.0500 },
    { id: 30, mineName: 'Khumani Mine', operatingCompany: 'Assmang', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'John Taolo Gaetsewe', physicalAddress: 'Kathu, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -27.2167, longitude: 22.9500 },
    { id: 2, mineName: 'Khwezela Colliery', operatingCompany: 'Anglo American', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Emalahleni, Mpumalanga', mineType: 'Both', operationalStatus: 'Active', latitude: -25.8700, longitude: 29.2100 },
    { id: 16, mineName: 'Kloof Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Westonaria, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.4000, longitude: 27.5833 },
    { id: 39, mineName: 'Koffiefontein Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Free State', district: 'Xhariep', physicalAddress: 'Koffiefontein, Free State', mineType: 'Underground', operationalStatus: 'Active', latitude: -29.4167, longitude: 25.0000 },
    { id: 27, mineName: 'Kolomela Mine', operatingCompany: 'Kumba Iron Ore', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'Siyanda', physicalAddress: 'Postmasburg, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -28.3333, longitude: 23.0833 },
    { id: 24, mineName: 'Kroondal Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Rustenburg, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.6500, longitude: 27.3167 },
    { id: 12, mineName: 'Kusasalethu Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Carletonville, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.3667, longitude: 27.3833 },
    { id: 5, mineName: 'Mafube Colliery', operatingCompany: 'Exxaro', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Belfast, Mpumalanga', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -25.6800, longitude: 30.0400 },
    { id: 25, mineName: 'Marikana Mine', operatingCompany: 'Sibanye-Stillwater', commodityId: 3, commodityName: 'PGM', province: 'North West', district: 'Bojanala', physicalAddress: 'Marikana, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -25.7000, longitude: 27.4833 },
    { id: 21, mineName: 'Marula Mine', operatingCompany: 'Impala Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Sekhukhune', physicalAddress: 'Burgersfort, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -24.5000, longitude: 30.1500 },
    { id: 7, mineName: 'Matla Colliery', operatingCompany: 'Eskom', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Nkangala', physicalAddress: 'Kriel, Mpumalanga', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.2500, longitude: 29.2500 },
    { id: 11, mineName: 'Moab Khotsong Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'North West', district: 'Dr Kenneth Kaunda', physicalAddress: 'Orkney, North West', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.9833, longitude: 26.6667 },
    { id: 17, mineName: 'Mogalakwena Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Mokopane, Limpopo', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -23.9333, longitude: 28.7667 },
    { id: 10, mineName: 'Mponeng Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Carletonville, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.4000, longitude: 27.3833 },
    { id: 8, mineName: 'New Denmark Colliery', operatingCompany: 'Eskom', commodityId: 1, commodityName: 'Coal', province: 'Mpumalanga', district: 'Gert Sibande', physicalAddress: 'Standerton, Mpumalanga', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -26.9300, longitude: 29.2400 },
    { id: 31, mineName: 'Palabora Mining Company', operatingCompany: 'Palabora Mining Company', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Limpopo', district: 'Mopani', physicalAddress: 'Phalaborwa, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -23.9667, longitude: 31.1333 },
    { id: 34, mineName: 'Prieska Zinc-Copper', operatingCompany: 'Orion Minerals', commodityId: 5, commodityName: 'Copper/Base Metals', province: 'Northern Cape', district: 'Siyanda', physicalAddress: 'Prieska, Northern Cape', mineType: 'Underground', operationalStatus: 'Care and Maintenance', latitude: -29.6667, longitude: 22.7500 },
    { id: 26, mineName: 'Sishen Mine', operatingCompany: 'Kumba Iron Ore', commodityId: 4, commodityName: 'Iron Ore', province: 'Northern Cape', district: 'John Taolo Gaetsewe', physicalAddress: 'Kathu, Northern Cape', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -27.2000, longitude: 23.0000 },
    { id: 9, mineName: 'South Deep Mine', operatingCompany: 'Gold Fields', commodityId: 2, commodityName: 'Gold', province: 'Gauteng', district: 'West Rand', physicalAddress: 'Westonaria, Gauteng', mineType: 'Underground', operationalStatus: 'Active', latitude: -26.4167, longitude: 27.6667 },
    { id: 13, mineName: 'Target Mine', operatingCompany: 'Harmony Gold', commodityId: 2, commodityName: 'Gold', province: 'Free State', district: 'Lejweleputswa', physicalAddress: 'Allanridge, Free State', mineType: 'Underground', operationalStatus: 'Active', latitude: -27.7667, longitude: 26.6333 },
    { id: 28, mineName: 'Thabazimbi Mine', operatingCompany: 'Kumba Iron Ore', commodityId: 4, commodityName: 'Iron Ore', province: 'Limpopo', district: 'Waterberg', physicalAddress: 'Thabazimbi, Limpopo', mineType: 'Both', operationalStatus: 'Care and Maintenance', latitude: -24.5833, longitude: 27.4000 },
    { id: 22, mineName: 'Two Rivers Mine', operatingCompany: 'Impala Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Sekhukhune', physicalAddress: 'Steelpoort, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -24.6833, longitude: 30.1000 },
    { id: 19, mineName: 'Unki Mine', operatingCompany: 'Anglo American Platinum', commodityId: 3, commodityName: 'PGM', province: 'Limpopo', district: 'Capricorn', physicalAddress: 'Polokwane, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -23.9000, longitude: 29.4500 },
    { id: 35, mineName: 'Venetia Mine', operatingCompany: 'De Beers', commodityId: 6, commodityName: 'Diamonds', province: 'Limpopo', district: 'Vhembe', physicalAddress: 'Musina, Limpopo', mineType: 'Underground', operationalStatus: 'Active', latitude: -22.4500, longitude: 29.3167 },
    { id: 36, mineName: 'Voorspoed Mine', operatingCompany: 'De Beers', commodityId: 6, commodityName: 'Diamonds', province: 'Free State', district: 'Lejweleputswa', physicalAddress: 'Kroonstad, Free State', mineType: 'Open Cast', operationalStatus: 'Active', latitude: -27.7667, longitude: 27.2333 },
    { id: 40, mineName: 'Williamson Mine', operatingCompany: 'Petra Diamonds', commodityId: 6, commodityName: 'Diamonds', province: 'Free State', district: 'Xhariep', physicalAddress: 'Jagersfontein, Free State', mineType: 'Open Cast', operationalStatus: 'Care and Maintenance', latitude: -29.7667, longitude: 25.4333 },
  ];

  // Fetch SA mines on mount
  useEffect(() => {
    const fetchMines = async () => {
      setIsLoadingMines(true);
      try {
        const activeMines = await minesApi.getActiveMines();
        setMines(activeMines);
      } catch (error) {
        // Silently use fallback mines when backend is unavailable
        if (error instanceof Error && error.message !== 'Backend unavailable') {
          console.error('Failed to fetch mines:', error);
        }
        setMines(fallbackMines);
      } finally {
        setIsLoadingMines(false);
      }
    };
    fetchMines();
  }, []);

  // Fallback slurry profiles by commodity when API is unavailable
  const fallbackSlurryProfiles: Record<string, any> = {
    'Coal': { phMin: 6.5, phMax: 8.5, typicalSgMin: 1.10, typicalSgMax: 1.35, solidsConcentrationMin: 20, solidsConcentrationMax: 45, tempMin: 15, tempMax: 45, abrasionRisk: 'Medium', corrosionRisk: 'Low', primaryFailureMode: 'Abrasion' },
    'Gold': { phMin: 10.0, phMax: 11.5, typicalSgMin: 1.30, typicalSgMax: 1.50, solidsConcentrationMin: 40, solidsConcentrationMax: 55, tempMin: 20, tempMax: 60, abrasionRisk: 'Very High', corrosionRisk: 'High', primaryFailureMode: 'Abrasion' },
    'PGM': { phMin: 8.0, phMax: 10.0, typicalSgMin: 1.25, typicalSgMax: 1.45, solidsConcentrationMin: 35, solidsConcentrationMax: 50, tempMin: 20, tempMax: 55, abrasionRisk: 'Very High', corrosionRisk: 'Medium', primaryFailureMode: 'Abrasion' },
    'Iron Ore': { phMin: 6.5, phMax: 8.0, typicalSgMin: 1.50, typicalSgMax: 2.00, solidsConcentrationMin: 50, solidsConcentrationMax: 70, tempMin: 15, tempMax: 40, abrasionRisk: 'Very High', corrosionRisk: 'Low', primaryFailureMode: 'Abrasion' },
    'Copper/Base Metals': { phMin: 1.5, phMax: 4.0, typicalSgMin: 1.20, typicalSgMax: 1.40, solidsConcentrationMin: 25, solidsConcentrationMax: 45, tempMin: 25, tempMax: 65, abrasionRisk: 'High', corrosionRisk: 'Very High', primaryFailureMode: 'Corrosion' },
    'Diamonds': { phMin: 6.5, phMax: 8.0, typicalSgMin: 1.40, typicalSgMax: 1.80, solidsConcentrationMin: 30, solidsConcentrationMax: 50, tempMin: 15, tempMax: 35, abrasionRisk: 'Medium', corrosionRisk: 'Low', primaryFailureMode: 'Abrasion' },
  };

  // Fallback environmental data by South African province (typical values)
  const fallbackEnvironmentalByProvince: Record<string, any> = {
    'Mpumalanga': {
      tempMin: 8, tempMax: 28, tempMean: 18, humidityMin: 45, humidityMax: 85, humidityMean: 65,
      annualRainfall: '500-1000', ecpMarineInfluence: 'None', ecpIso12944Category: 'C3',
      ecpIndustrialPollution: 'Moderate', soilType: 'Ferralsols', soilTexture: 'Clay Loam',
      soilMoisture: '25%', soilMoistureClass: 'Moderate', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '350 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 3.5,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'Limpopo': {
      tempMin: 10, tempMax: 32, tempMean: 22, humidityMin: 35, humidityMax: 75, humidityMean: 55,
      annualRainfall: '250-500', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Low', soilType: 'Lixisols', soilTexture: 'Sandy Clay Loam',
      soilMoisture: '18%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '400 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Low', uvExposure: 'Very High', windSpeed: 2.8,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Low', isoCategory: 'T2' },
    },
    'Gauteng': {
      tempMin: 5, tempMax: 28, tempMean: 16, humidityMin: 40, humidityMax: 80, humidityMean: 60,
      annualRainfall: '500-1000', ecpMarineInfluence: 'None', ecpIso12944Category: 'C3',
      ecpIndustrialPollution: 'High', soilType: 'Acrisols', soilTexture: 'Clay Loam',
      soilMoisture: '22%', soilMoistureClass: 'Moderate', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '500 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 4.2,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'North West': {
      tempMin: 3, tempMax: 32, tempMean: 18, humidityMin: 30, humidityMax: 70, humidityMean: 50,
      annualRainfall: '250-500', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Moderate', soilType: 'Luvisols', soilTexture: 'Sandy Loam',
      soilMoisture: '15%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '450 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Low', uvExposure: 'High', windSpeed: 3.8,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Low', isoCategory: 'T2' },
    },
    'Northern Cape': {
      tempMin: 2, tempMax: 35, tempMean: 19, humidityMin: 20, humidityMax: 60, humidityMean: 40,
      annualRainfall: '<250', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Low', soilType: 'Calcisols', soilTexture: 'Sandy Loam',
      soilMoisture: '10%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '300 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'None', uvExposure: 'Very High', windSpeed: 4.5,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Very Low', isoCategory: 'T1' },
    },
    'Free State': {
      tempMin: 0, tempMax: 30, tempMean: 15, humidityMin: 35, humidityMax: 75, humidityMean: 55,
      annualRainfall: '500-1000', ecpMarineInfluence: 'None', ecpIso12944Category: 'C2',
      ecpIndustrialPollution: 'Low', soilType: 'Vertisols', soilTexture: 'Clay',
      soilMoisture: '20%', soilMoistureClass: 'Moderate', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '400 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 4.0,
      airSaltContent: { level: 'Very Low', isoCategory: 'S0' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'KwaZulu-Natal': {
      tempMin: 12, tempMax: 28, tempMean: 20, humidityMin: 60, humidityMax: 90, humidityMean: 75,
      annualRainfall: '1000-2000', ecpMarineInfluence: 'Coastal', ecpIso12944Category: 'C4',
      ecpIndustrialPollution: 'Moderate', soilType: 'Nitisols', soilTexture: 'Clay',
      soilMoisture: '35%', soilMoistureClass: 'High', soilDrainage: 'Moderate',
      distanceToCoastFormatted: '50 km', detailedMarineInfluence: 'Moderate Marine',
      floodRisk: 'High', uvExposure: 'High', windSpeed: 3.2,
      airSaltContent: { level: 'Medium', isoCategory: 'S2' },
      timeOfWetness: { level: 'High', isoCategory: 'T4' },
    },
    'Eastern Cape': {
      tempMin: 8, tempMax: 26, tempMean: 17, humidityMin: 55, humidityMax: 85, humidityMean: 70,
      annualRainfall: '500-1000', ecpMarineInfluence: 'Coastal', ecpIso12944Category: 'C3',
      ecpIndustrialPollution: 'Low', soilType: 'Cambisols', soilTexture: 'Loam',
      soilMoisture: '28%', soilMoistureClass: 'Moderate', soilDrainage: 'Well',
      distanceToCoastFormatted: '100 km', detailedMarineInfluence: 'Low / Non-Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 4.8,
      airSaltContent: { level: 'Low', isoCategory: 'S1' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
    'Western Cape': {
      tempMin: 7, tempMax: 26, tempMean: 16, humidityMin: 50, humidityMax: 85, humidityMean: 68,
      annualRainfall: '500-1000', ecpMarineInfluence: 'Coastal', ecpIso12944Category: 'C4',
      ecpIndustrialPollution: 'Low', soilType: 'Arenosols', soilTexture: 'Sandy Loam',
      soilMoisture: '18%', soilMoistureClass: 'Low', soilDrainage: 'Well',
      distanceToCoastFormatted: '30 km', detailedMarineInfluence: 'High Marine',
      floodRisk: 'Moderate', uvExposure: 'High', windSpeed: 5.2,
      airSaltContent: { level: 'High', isoCategory: 'S3' },
      timeOfWetness: { level: 'Medium', isoCategory: 'T3' },
    },
  };

  // Get fallback environmental data for a province
  const getFallbackEnvironmentalData = (province: string) => {
    return fallbackEnvironmentalByProvince[province] || fallbackEnvironmentalByProvince['Gauteng'];
  };

  // Fallback lining recommendations by risk levels
  const getFallbackLiningRecommendation = (abrasionRisk: string, corrosionRisk: string) => {
    if (abrasionRisk === 'Very High' && corrosionRisk === 'Low') return { recommendedLining: 'Ceramic Tile (95% Al2O3)', recommendedCoating: 'None' };
    if (abrasionRisk === 'Very High' && corrosionRisk === 'Medium') return { recommendedLining: 'Ceramic + Rubber Composite', recommendedCoating: 'Rubber Backing' };
    if (abrasionRisk === 'High' && corrosionRisk === 'Very High') return { recommendedLining: 'Rubber + Ceramic Composite', recommendedCoating: 'Rubber Backed Ceramic' };
    if (corrosionRisk === 'Very High') return { recommendedLining: 'HDPE/UHMWPE Lining', recommendedCoating: 'N/A - Self Protecting' };
    if (abrasionRisk === 'High') return { recommendedLining: 'Ceramic Tile Lining', recommendedCoating: 'None' };
    if (abrasionRisk === 'Medium') return { recommendedLining: 'Rubber Lining (Hard)', recommendedCoating: 'Epoxy Coating' };
    return { recommendedLining: 'Standard Steel', recommendedCoating: 'Epoxy Paint' };
  };

  // Handle mine selection
  const handleMineSelect = async (mineId: number | null) => {
    setSelectedMineId(mineId);

    if (!mineId) {
      return;
    }

    setMineDataLoading(true);
    try {
      // Fetch mine with environmental data (includes slurry profile and lining recommendation)
      const mineData = await minesApi.getMineWithEnvironmentalData(mineId);
      const { mine, slurryProfile, liningRecommendation } = mineData;

      // Auto-fill location fields
      if (mine.latitude && mine.longitude) {
        onUpdate('latitude', mine.latitude);
        onUpdate('longitude', mine.longitude);
      }
      if (mine.physicalAddress) {
        onUpdate('siteAddress', mine.physicalAddress);
      }
      if (mine.province) {
        onUpdate('region', mine.province);
      }
      onUpdate('country', 'South Africa');

      // Mark location fields as auto-filled
      setLocationAutoFilled({
        latitude: !!mine.latitude,
        longitude: !!mine.longitude,
        siteAddress: !!mine.physicalAddress,
        region: !!mine.province,
        country: true,
      });

      // Auto-fill environmental intelligence from slurry profile
      if (slurryProfile && onUpdateGlobalSpecs) {
        const updatedSpecs = {
          ...globalSpecs,
          // Slurry characteristics from commodity profile
          mineSelected: mine.mineName,
          mineCommodity: slurryProfile.commodityName,
          slurryPHMin: slurryProfile.phMin,
          slurryPHMax: slurryProfile.phMax,
          slurrySGMin: slurryProfile.typicalSgMin,
          slurrySGMax: slurryProfile.typicalSgMax,
          slurrySolidsMin: slurryProfile.solidsConcentrationMin,
          slurrySolidsMax: slurryProfile.solidsConcentrationMax,
          slurryTempMin: slurryProfile.tempMin,
          slurryTempMax: slurryProfile.tempMax,
          abrasionRisk: slurryProfile.abrasionRisk,
          corrosionRisk: slurryProfile.corrosionRisk,
          primaryFailureMode: slurryProfile.primaryFailureMode,
        };

        // Add lining recommendation if available
        if (liningRecommendation) {
          updatedSpecs.recommendedLining = liningRecommendation.recommendedLining;
          updatedSpecs.recommendedCoating = liningRecommendation.recommendedCoating;
          updatedSpecs.liningApplicationNotes = liningRecommendation.applicationNotes;
        }

        // Also fetch environmental/weather data based on mine location
        if (mine.latitude && mine.longitude) {
          try {
            console.log('[Mine Selection] Fetching environmental data for:', mine.mineName);
            const environmentalData = await fetchEnvironmentalData(
              mine.latitude,
              mine.longitude,
              mine.province,
              'South Africa'
            );
            console.log('[Mine Selection] Environmental data received:', environmentalData);

            // Merge environmental data with slurry profile data
            Object.assign(updatedSpecs, environmentalData);
          } catch (error) {
            // Silently handle - user can still fill in manually
            if (error instanceof Error && error.message !== 'Backend unavailable') {
              console.error('[Mine Selection] Failed to fetch environmental data:', error);
            }
          }
        }

        onUpdateGlobalSpecs(updatedSpecs);
      } else if (mine.latitude && mine.longitude && onUpdateGlobalSpecs) {
        // Even without slurry profile, fetch environmental data if we have coordinates
        try {
          console.log('[Mine Selection] Fetching environmental data (no slurry profile):', mine.mineName);
          const environmentalData = await fetchEnvironmentalData(
            mine.latitude,
            mine.longitude,
            mine.province,
            'South Africa'
          );
          console.log('[Mine Selection] Environmental data received:', environmentalData);
          onUpdateGlobalSpecs({
            ...globalSpecs,
            mineSelected: mine.mineName,
            ...environmentalData,
          });
        } catch (error) {
          // Silently handle - user can still fill in manually
          if (error instanceof Error && error.message !== 'Backend unavailable') {
            console.error('[Mine Selection] Failed to fetch environmental data:', error);
          }
        }
      }

      console.log('[Mine Selection] Auto-filled from mine:', mine.mineName);
    } catch (error) {
      // When backend is unavailable, use fallback mine data from local list
      const fallbackMine = fallbackMines.find(m => m.id === mineId);
      if (fallbackMine) {
        console.log('[Mine Selection] Using fallback data for:', fallbackMine.mineName);

        // Auto-fill location fields from fallback data
        if (fallbackMine.latitude && fallbackMine.longitude) {
          onUpdate('latitude', fallbackMine.latitude);
          onUpdate('longitude', fallbackMine.longitude);
        }
        if (fallbackMine.physicalAddress) {
          onUpdate('siteAddress', fallbackMine.physicalAddress);
        }
        if (fallbackMine.province) {
          onUpdate('region', fallbackMine.province);
        }
        onUpdate('country', 'South Africa');

        // Mark location fields as auto-filled
        setLocationAutoFilled({
          latitude: !!fallbackMine.latitude,
          longitude: !!fallbackMine.longitude,
          siteAddress: !!fallbackMine.physicalAddress,
          region: !!fallbackMine.province,
          country: true,
        });

        // Auto-fill environmental intelligence from fallback data
        if (onUpdateGlobalSpecs) {
          const slurryProfile = fallbackMine.commodityName ? fallbackSlurryProfiles[fallbackMine.commodityName] : null;
          const envData = getFallbackEnvironmentalData(fallbackMine.province);
          const liningRec = slurryProfile ? getFallbackLiningRecommendation(slurryProfile.abrasionRisk, slurryProfile.corrosionRisk) : null;

          const updatedSpecs: any = {
            ...globalSpecs,
            mineSelected: fallbackMine.mineName,
            mineCommodity: fallbackMine.commodityName,
            // Environmental Intelligence fields from province data
            tempMin: envData.tempMin,
            tempMax: envData.tempMax,
            tempMean: envData.tempMean,
            humidityMin: envData.humidityMin,
            humidityMax: envData.humidityMax,
            humidityMean: envData.humidityMean,
            annualRainfall: envData.annualRainfall,
            ecpMarineInfluence: envData.ecpMarineInfluence,
            ecpIso12944Category: envData.ecpIso12944Category,
            ecpIndustrialPollution: envData.ecpIndustrialPollution,
            soilType: envData.soilType,
            soilTexture: envData.soilTexture,
            soilMoisture: envData.soilMoisture,
            soilMoistureClass: envData.soilMoistureClass,
            soilDrainage: envData.soilDrainage,
            distanceToCoastFormatted: envData.distanceToCoastFormatted,
            detailedMarineInfluence: envData.detailedMarineInfluence,
            // Additional environmental fields
            floodRisk: envData.floodRisk,
            uvExposure: envData.uvExposure,
            windSpeed: envData.windSpeed,
            airSaltContent: envData.airSaltContent,
            timeOfWetness: envData.timeOfWetness,
          };

          // Add slurry profile data if available
          if (slurryProfile) {
            updatedSpecs.slurryPHMin = slurryProfile.phMin;
            updatedSpecs.slurryPHMax = slurryProfile.phMax;
            updatedSpecs.slurrySGMin = slurryProfile.typicalSgMin;
            updatedSpecs.slurrySGMax = slurryProfile.typicalSgMax;
            updatedSpecs.slurrySolidsMin = slurryProfile.solidsConcentrationMin;
            updatedSpecs.slurrySolidsMax = slurryProfile.solidsConcentrationMax;
            updatedSpecs.slurryTempMin = slurryProfile.tempMin;
            updatedSpecs.slurryTempMax = slurryProfile.tempMax;
            updatedSpecs.abrasionRisk = slurryProfile.abrasionRisk;
            updatedSpecs.corrosionRisk = slurryProfile.corrosionRisk;
            updatedSpecs.primaryFailureMode = slurryProfile.primaryFailureMode;
          }

          // Add lining recommendation if available
          if (liningRec) {
            updatedSpecs.recommendedLining = liningRec.recommendedLining;
            updatedSpecs.recommendedCoating = liningRec.recommendedCoating;
          }

          onUpdateGlobalSpecs(updatedSpecs);

          // Mark environmental fields as auto-filled for green styling
          markFieldsAsAutoFilled([
            'tempMin',
            'tempMax',
            'tempMean',
            'humidityMin',
            'humidityMax',
            'humidityMean',
            'annualRainfall',
            'ecpMarineInfluence',
            'ecpIso12944Category',
            'ecpIndustrialPollution',
            'soilType',
            'soilTexture',
            'soilMoisture',
            'soilMoistureClass',
            'soilDrainage',
            'distanceToCoast',
            'distanceToCoastFormatted',
            'detailedMarineInfluence',
            'uvExposure',
            'windSpeed',
            'floodRisk',
            'airSaltContent',
            'timeOfWetness',
          ]);

          console.log('[Mine Selection] Auto-filled with fallback data for:', fallbackMine.mineName);
        }
      } else if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('Failed to fetch mine environmental data:', error);
      }
    } finally {
      setMineDataLoading(false);
    }
  };

  // Handle new mine created from modal
  const handleMineCreated = (newMine: SaMine) => {
    // Add the new mine to the list
    setMines(prevMines => [...prevMines, newMine].sort((a, b) => a.mineName.localeCompare(b.mineName)));
    // Select the newly created mine
    handleMineSelect(newMine.id);
    // Close the modal
    setShowAddMineModal(false);
  };

  // Handle mine dropdown change
  const handleMineDropdownChange = (value: string) => {
    if (value === 'add-new') {
      setShowAddMineModal(true);
    } else {
      handleMineSelect(value ? Number(value) : null);
    }
  };

  // Auto-generate RFQ number if field is empty (but not when loading a draft)
  useEffect(() => {
    // Skip auto-generation if we're loading a draft - the draft will provide the projectName
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('draft') || urlParams.get('draftId')) return;

    if (!rfqData.projectName || rfqData.projectName.trim() === '') {
      const autoGenNumber = generateSystemReferenceNumber();
      onUpdate('projectName', autoGenNumber);
    }
  }, []);

  const addNote = (note: string) => {
    if (note && !additionalNotes.includes(note)) {
      const newNotes = [...additionalNotes, note];
      setAdditionalNotes(newNotes);
      const currentNotes = rfqData.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n• ${note}` : `• ${note}`;
      onUpdate('notes', updatedNotes);
    }
  };

  const removeNote = (noteToRemove: string) => {
    const newNotes = additionalNotes.filter(note => note !== noteToRemove);
    setAdditionalNotes(newNotes);
    const updatedNotes = newNotes.length > 0 ? newNotes.map(note => `• ${note}`).join('\n') : '';
    onUpdate('notes', updatedNotes);
  };

  // Helper to update environmental fields in globalSpecs (not rfqData)
  // This ensures they get saved properly since save function saves globalSpecs
  const updateEnvironmentalField = useCallback((field: string, value: any) => {
    console.log(`🌍 Environmental field updated: ${field} =`, value);
    if (onUpdateGlobalSpecs) {
      onUpdateGlobalSpecs({
        ...globalSpecs,
        [field]: value,
      });
    }
  }, [globalSpecs, onUpdateGlobalSpecs]);

  // Validation helper functions
  const hasRequiredLocationData = () => {
    return !!(
      rfqData.latitude &&
      rfqData.longitude &&
      rfqData.siteAddress &&
      rfqData.region &&
      rfqData.country
    );
  };

  const hasRequiredEnvironmentalData = () => {
    // Soil Conditions - visible fields required
    const hasSoilData = !!(
      (globalSpecs?.soilTexture || rfqData.soilTexture) &&
      (globalSpecs?.soilMoistureClass || rfqData.soilMoistureClass) &&
      (globalSpecs?.soilDrainage || rfqData.soilDrainage)
    );

    // Atmospheric Conditions - only visible fields required
    const hasAtmosphericData = !!(
      (globalSpecs?.tempMin !== undefined || rfqData.tempMin !== undefined) &&
      (globalSpecs?.tempMax !== undefined || rfqData.tempMax !== undefined) &&
      (globalSpecs?.humidityMean !== undefined) &&
      (globalSpecs?.annualRainfall || rfqData.rainfall)
    );

    // Marine & Special Conditions - visible dropdown fields required
    const hasMarineData = !!(
      (globalSpecs?.detailedMarineInfluence || rfqData.marineInfluence) &&
      (globalSpecs?.floodRisk || rfqData.floodingRisk) &&
      (globalSpecs?.ecpIndustrialPollution || rfqData.industrialPollution)
    );

    return hasSoilData && hasAtmosphericData && hasMarineData;
  };

  // Handlers for confirmation/edit
  const handleConfirmLocation = () => {
    if (hasRequiredLocationData()) {
      setLocationConfirmed(true);
      setIsEditingLocation(false);
    }
  };

  const handleConfirmEnvironmental = () => {
    if (hasRequiredEnvironmentalData()) {
      setEnvironmentalConfirmed(true);
      setIsEditingEnvironmental(false);
    }
  };

  const handleEditLocation = () => {
    setIsEditingLocation(true);
  };

  const handleEditEnvironmental = () => {
    setIsEditingEnvironmental(true);
  };

  // Customer auth for auto-filling customer fields
  const { isAuthenticated, customer, profile } = useCustomerAuth();

  // Track which customer fields were auto-filled
  const [customerAutoFilled, setCustomerAutoFilled] = useState<{
    customerName: boolean;
    customerEmail: boolean;
    customerPhone: boolean;
  }>({
    customerName: false,
    customerEmail: false,
    customerPhone: false,
  });

  // Auto-fill customer fields when logged in (but not when loading a draft)
  useEffect(() => {
    // Skip auto-fill if we're loading a draft - the draft will provide customer info
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('draft') || urlParams.get('draftId')) return;

    if (isAuthenticated && profile) {
      const updates: { customerName?: boolean; customerEmail?: boolean; customerPhone?: boolean } = {};

      // Auto-fill customer name if empty
      if (!rfqData.customerName && (profile.firstName || profile.lastName)) {
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        onUpdate('customerName', fullName);
        updates.customerName = true;
      }

      // Auto-fill customer email if empty
      if (!rfqData.customerEmail && profile.email) {
        onUpdate('customerEmail', profile.email);
        updates.customerEmail = true;
      }

      // Auto-fill customer phone if empty (try mobilePhone, directPhone, or company primaryPhone)
      const phoneNumber = profile.mobilePhone || profile.directPhone || profile.company?.primaryPhone;
      if (!rfqData.customerPhone && phoneNumber) {
        onUpdate('customerPhone', phoneNumber);
        updates.customerPhone = true;
      }

      if (Object.keys(updates).length > 0) {
        setCustomerAutoFilled(prev => ({ ...prev, ...updates }));
      }
    }
  }, [isAuthenticated, profile, rfqData.customerName, rfqData.customerEmail, rfqData.customerPhone, onUpdate]);

  // Derived state for locked sections
  const isLocationLocked = locationConfirmed && !isEditingLocation;
  const isEnvironmentalLocked = environmentalConfirmed && !isEditingEnvironmental;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Project/RFQ Details</h2>

      <div className="space-y-2">
        {/* Customer Information - Required fields */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Customer Information
            {isAuthenticated && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Logged in
              </span>
            )}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div data-field="customerName">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerName}
                onChange={(val) => onUpdate('customerName', val)}
                onOverride={() => setCustomerAutoFilled(prev => ({ ...prev, customerName: false }))}
                isAutoFilled={customerAutoFilled.customerName}
                placeholder="Customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div data-field="customerEmail">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Email <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerEmail}
                onChange={(val) => onUpdate('customerEmail', val)}
                onOverride={() => setCustomerAutoFilled(prev => ({ ...prev, customerEmail: false }))}
                isAutoFilled={customerAutoFilled.customerEmail}
                placeholder="email@company.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>
              )}
            </div>

            <div data-field="customerPhone">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Phone <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerPhone}
                onChange={(val) => onUpdate('customerPhone', val)}
                onOverride={() => setCustomerAutoFilled(prev => ({ ...prev, customerPhone: false }))}
                isAutoFilled={customerAutoFilled.customerPhone}
                placeholder="+27 11 555 0123"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>
              )}
            </div>

            <div data-field="requiredDate">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Required Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={rfqData.requiredDate}
                onChange={(e) => onUpdate('requiredDate', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                required
              />
              {errors.requiredDate && (
                <p className="mt-1 text-xs text-red-600">{errors.requiredDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Project Name and Description - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div data-field="projectName">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Project/RFQ Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={rfqData.projectName}
              onChange={(e) => onUpdate('projectName', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Enter name (auto-generated if empty)"
            />
            {errors.projectName && (
              <p className="mt-1 text-xs text-red-600">{errors.projectName}</p>
            )}
          </div>
          <div data-field="description">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              RFQ Description <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={rfqData.description}
              onChange={(e) => onUpdate('description', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Brief description of requirements"
            />
          </div>
        </div>

        {/* Project Type Selection - Compact */}
        <div data-field="projectType" className={projectTypeConfirmed ? 'opacity-75' : ''}>
          <label className={`block text-xs font-semibold mb-1 ${hasProjectTypeError ? 'text-red-700' : 'text-gray-900'}`}>
            Project Type <span className="text-red-600">*</span>
            {projectTypeConfirmed && <span className="ml-2 text-green-600 text-xs font-normal">(Locked)</span>}
          </label>
          <div className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? 'pointer-events-none' : ''}`}>
            {[
              { value: 'standard', label: 'Standard RFQ' },
              { value: 'phase1', label: 'Phase 1 Tender' },
              { value: 'retender', label: 'Re-Tender' },
              { value: 'feasibility', label: 'Feasibility' }
            ].map((type) => (
              <label
                key={type.value}
                className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  rfqData.projectType === type.value
                    ? 'border-blue-600 bg-blue-50'
                    : hasProjectTypeError
                      ? 'border-red-400 hover:border-red-500'
                      : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="projectType"
                  value={type.value}
                  checked={rfqData.projectType === type.value}
                  onChange={(e) => {
                    console.log('🔘 Project type selected:', e.target.value);
                    onUpdate('projectType', e.target.value);
                  }}
                  className="sr-only"
                  disabled={projectTypeConfirmed}
                />
                <div className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                  rfqData.projectType === type.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {rfqData.projectType === type.value && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                </div>
                <span className="font-medium text-gray-900">{type.label}</span>
              </label>
            ))}
          </div>
          {errors.projectType && <p className="mt-1 text-xs text-red-600">{errors.projectType}</p>}
        </div>

        {/* Required Products/Services Selection - Compact */}
        <div data-field="requiredProducts" className={projectTypeConfirmed ? 'opacity-75' : ''}>
          <label className="block text-xs font-semibold text-gray-900 mb-1">
            Required Products & Services <span className="text-red-600">*</span>
            {projectTypeConfirmed && <span className="ml-2 text-green-600 text-xs font-normal">(Locked)</span>}
          </label>
          <div className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? 'pointer-events-none' : ''}`}>
            {PRODUCTS_AND_SERVICES.map((product) => {
              const isSelected = rfqData.requiredProducts?.includes(product.value);
              return (
                <label
                  key={product.value}
                  className={`flex items-center gap-2 px-2 py-2 border-2 rounded-lg cursor-pointer transition-all text-xs ${
                    isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const currentProducts = rfqData.requiredProducts || [];
                      let newProducts: string[];
                      if (e.target.checked) {
                        newProducts = [...currentProducts, product.value];
                      } else {
                        newProducts = currentProducts.filter((p: string) => p !== product.value);
                      }
                      console.log('☑️ Required products updated:', newProducts);
                      onUpdate('requiredProducts', newProducts);
                    }}
                    className="sr-only"
                    disabled={projectTypeConfirmed}
                  />
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <span>{product.icon}</span>
                  <span className="font-medium text-gray-900">{product.label}</span>
                </label>
              );
            })}
          </div>
          {errors.requiredProducts && <p className="mt-1 text-xs text-red-600">{errors.requiredProducts}</p>}
        </div>

        {/* Project Type & Products Confirmation Button */}
        <div className="flex justify-end">
          {!projectTypeConfirmed ? (
            <button
              type="button"
              onClick={() => {
                if (!rfqData.projectType) {
                  alert('Please select a Project Type before confirming.');
                  return;
                }
                if (!rfqData.requiredProducts || rfqData.requiredProducts.length === 0) {
                  alert('Please select at least one Required Product/Service before confirming.');
                  return;
                }
                console.log('✅ Project type & products confirmed:', {
                  projectType: rfqData.projectType,
                  requiredProducts: rfqData.requiredProducts
                });
                setProjectTypeConfirmed(true);
              }}
              disabled={!rfqData.projectType || !rfqData.requiredProducts || rfqData.requiredProducts.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
            >
              ✓ Confirm Project Type & Products
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Project Type & Products Confirmed
              </span>
              <button
                type="button"
                onClick={() => setProjectTypeConfirmed(false)}
                className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Additional Notes - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Quick Notes
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addNote(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
            >
              <option value="">Add common note...</option>
              {commonNotes.map((note, index) => (
                <option key={index} value={note} disabled={additionalNotes.includes(note)}>
                  {note}
                </option>
              ))}
            </select>
            {additionalNotes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {additionalNotes.map((note, index) => (
                  <span key={index} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                    {note.substring(0, 20)}...
                    <button type="button" onClick={() => removeNote(note)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Custom Notes
            </label>
            <textarea
              value={rfqData.notes}
              onChange={(e) => onUpdate('notes', e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Additional requirements..."
            />
          </div>
        </div>

        {/* Project Location - Compact */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Project Location
            </h4>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              disabled={isLocationLocked}
              className={`flex items-center gap-1 px-3 py-1.5 text-white transition-colors text-xs font-medium shadow-sm rounded-lg ${
                isLocationLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Pick on Map
            </button>
          </div>

          {/* SA Mines Dropdown - Compact */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Quick Select: SA Mine (auto-fills location & slurry)
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedMineId || ''}
                onChange={(e) => handleMineDropdownChange(e.target.value)}
                disabled={isLoadingMines || mineDataLoading || isLocationLocked}
                style={{ colorScheme: 'light', color: '#000000', backgroundColor: '#fef3c7' }}
                className="w-full px-2 py-1.5 border border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="" style={{ color: '#000000', backgroundColor: '#fef3c7' }}>-- Select a mine (optional) --</option>
                <option value="add-new" style={{ color: '#b45309', backgroundColor: '#fef3c7' }} className="font-medium">+ Add a mine not listed</option>
                {mines.map((mine) => (
                  <option key={mine.id} value={mine.id} style={{ color: '#000000', backgroundColor: '#fef3c7' }}>
                    {mine.mineName} - {mine.operatingCompany} ({mine.commodityName || 'Unknown'}) - {mine.province}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {(isLoadingMines || mineDataLoading) ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>
                ) : (
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
            {selectedMineId && (
              <div className="mt-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Location & slurry auto-filled
                <p className="text-xs text-amber-700 mt-1 ml-6">
                  Environmental intelligence will be populated based on commodity type
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Latitude
              </label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.latitude}
                onChange={(val) => onUpdate('latitude', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, latitude: false }))}
                isAutoFilled={locationAutoFilled.latitude}
                placeholder="-26.20227 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
              {!locationAutoFilled.latitude && (
                <p className="mt-1 text-xs text-gray-500">
                  Precision required for environmental analysis
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Longitude
              </label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.longitude}
                onChange={(val) => onUpdate('longitude', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, longitude: false }))}
                isAutoFilled={locationAutoFilled.longitude}
                placeholder="28.04363 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Site Address / Location Description
            </label>
            <AutoFilledInput
              type="text"
              value={rfqData.siteAddress}
              onChange={(val) => onUpdate('siteAddress', val)}
              onOverride={() => setLocationAutoFilled(prev => ({ ...prev, siteAddress: false }))}
              isAutoFilled={locationAutoFilled.siteAddress}
              placeholder="e.g., Secunda Refinery, Mpumalanga, South Africa"
              readOnly={isLocationLocked}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Region / Province
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.region}
                onChange={(val) => onUpdate('region', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, region: false }))}
                isAutoFilled={locationAutoFilled.region}
                placeholder="e.g., Gauteng, Western Cape"
                readOnly={isLocationLocked}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Country
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.country}
                onChange={(val) => onUpdate('country', val)}
                onOverride={() => setLocationAutoFilled(prev => ({ ...prev, country: false }))}
                isAutoFilled={locationAutoFilled.country}
                placeholder="e.g., South Africa"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          {/* Location Confirmation Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            {!locationConfirmed ? (
              <button
                type="button"
                onClick={handleConfirmLocation}
                disabled={!hasRequiredLocationData()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Location Data
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Location Confirmed
                </div>
                {!isEditingLocation ? (
                  <button
                    type="button"
                    onClick={handleEditLocation}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmLocation}
                    disabled={!hasRequiredLocationData()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
                  >
                    Re-confirm Changes
                  </button>
                )}
              </div>
            )}
            {!hasRequiredLocationData() && !locationConfirmed && (
              <p className="mt-2 text-sm text-amber-600">
                Please fill in all location fields to confirm this section.
              </p>
            )}
          </div>

          {showMapPicker && (
            <GoogleMapLocationPicker
              apiKey={GOOGLE_MAPS_API_KEY}
              config={getMapConfig()}
              initialLocation={
                rfqData.latitude && rfqData.longitude
                  ? { lat: rfqData.latitude, lng: rfqData.longitude }
                  : undefined
              }
              onLocationSelect={handleLocationSelect}
              onClose={() => setShowMapPicker(false)}
            />
          )}

          {/* Environmental Intelligence Loading/Status */}
          {isLoadingEnvironmental && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">
                Fetching environmental data for your location...
              </span>
            </div>
          )}


          {!isLoadingEnvironmental && environmentalErrors.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-amber-700">
                  Some environmental data could not be retrieved
                </span>
              </div>
              <ul className="text-xs text-amber-600 ml-7 list-disc list-inside">
                {environmentalErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-1 ml-7">
                Please fill in missing fields manually in the Environmental Intelligence section below.
              </p>
            </div>
          )}
        </div>

        {/* Environmental Intelligence Section - Compact */}
        <div className="mt-4 pt-4 border-t border-gray-300">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-600 rounded">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Environmental Intelligence</h3>
                <p className="text-xs text-gray-600">Pipeline Corrosion & Coating Data</p>
              </div>
            </div>

            {/* Environmental Data - Ultra Compact */}
            <div className="bg-white rounded p-2 border border-gray-200">
              {/* Soil Row - All 4 columns */}
              <div className="grid grid-cols-4 gap-1 mb-1">
                <div className="hidden">
                  <AutoFilledInput type="text" value={globalSpecs?.soilType || ''} onChange={(value) => updateEnvironmentalField('soilType', value)} onOverride={() => markAsOverridden('soilType')} isAutoFilled={wasAutoFilled('soilType')} placeholder="Soil type" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Soil Texture</label>
                  <AutoFilledSelect value={globalSpecs?.soilTexture || ''} onChange={(value) => updateEnvironmentalField('soilTexture', value)} onOverride={() => markAsOverridden('soilTexture')} isAutoFilled={wasAutoFilled('soilTexture')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Sand">Sand</option>
                    <option value="Loamy Sand">Loamy Sand</option>
                    <option value="Sandy Loam">Sandy Loam</option>
                    <option value="Loam">Loam</option>
                    <option value="Silt Loam">Silt Loam</option>
                    <option value="Silt">Silt</option>
                    <option value="Sandy Clay Loam">Sandy Clay Loam</option>
                    <option value="Clay Loam">Clay Loam</option>
                    <option value="Silty Clay Loam">Silty Clay Loam</option>
                    <option value="Sandy Clay">Sandy Clay</option>
                    <option value="Silty Clay">Silty Clay</option>
                    <option value="Clay">Clay</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Moisture</label>
                  <AutoFilledSelect value={globalSpecs?.soilMoistureClass || ''} onChange={(value) => updateEnvironmentalField('soilMoistureClass', value)} onOverride={() => markAsOverridden('soilMoistureClass')} isAutoFilled={wasAutoFilled('soilMoistureClass')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Drainage</label>
                  <AutoFilledSelect value={globalSpecs?.soilDrainage || ''} onChange={(value) => updateEnvironmentalField('soilDrainage', value)} onOverride={() => markAsOverridden('soilDrainage')} isAutoFilled={wasAutoFilled('soilDrainage')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Poor">Poor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Well">Well</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Rainfall</label>
                  <AutoFilledSelect value={globalSpecs?.annualRainfall || ''} onChange={(value) => updateEnvironmentalField('annualRainfall', value)} onOverride={() => markAsOverridden('annualRainfall')} isAutoFilled={wasAutoFilled('annualRainfall')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="<250">&lt;250mm</option>
                    <option value="250-500">250-500mm</option>
                    <option value="500-1000">500-1000mm</option>
                    <option value="1000-2000">1000-2000mm</option>
                    <option value=">2000">&gt;2000mm</option>
                  </AutoFilledSelect>
                </div>
              </div>

              {/* Atmospheric Row - Temperature */}
              <div className="grid grid-cols-5 gap-1 mb-1">
                <div>
                  <label className="block text-xs text-gray-600">Temp Min °C</label>
                  <AutoFilledInput type="number" step="0.1" value={globalSpecs?.tempMin ?? ''} onChange={(value) => updateEnvironmentalField('tempMin', value)} onOverride={() => markAsOverridden('tempMin')} isAutoFilled={wasAutoFilled('tempMin')} placeholder="-5" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Temp Mean</label>
                  <AutoFilledInput type="number" step="0.1" value={globalSpecs?.tempMean ?? ''} onChange={(value) => updateEnvironmentalField('tempMean', value)} onOverride={() => markAsOverridden('tempMean')} isAutoFilled={wasAutoFilled('tempMean')} placeholder="18" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Temp Max</label>
                  <AutoFilledInput type="number" step="0.1" value={globalSpecs?.tempMax ?? ''} onChange={(value) => updateEnvironmentalField('tempMax', value)} onOverride={() => markAsOverridden('tempMax')} isAutoFilled={wasAutoFilled('tempMax')} placeholder="38" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Humidity %</label>
                  <AutoFilledInput type="number" value={globalSpecs?.humidityMean ?? ''} onChange={(value) => onUpdateGlobalSpecs({ ...globalSpecs, humidityMean: value })} onOverride={() => markAsOverridden('humidityMean')} isAutoFilled={wasAutoFilled('humidityMean')} placeholder="65" disabled={isEnvironmentalLocked} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">UV Level</label>
                  <AutoFilledSelect value={globalSpecs?.uvExposure || ''} onChange={(value) => onUpdateGlobalSpecs({ ...globalSpecs, uvExposure: value })} onOverride={() => markAsOverridden('uvExposure')} isAutoFilled={wasAutoFilled('uvExposure')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </AutoFilledSelect>
                </div>
              </div>

              {/* Marine & Special Conditions - Compact Row 1 */}
              <div className="grid grid-cols-3 gap-1 mb-1">
                <div>
                  <label className="block text-xs text-gray-600">Coast Distance</label>
                  <AutoFilledDisplay value={globalSpecs?.distanceToCoastFormatted} isAutoFilled={wasAutoFilled('distanceToCoast')} label="Auto" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Marine Influence</label>
                  <AutoFilledSelect value={globalSpecs?.detailedMarineInfluence || ''} onChange={(value) => updateEnvironmentalField('detailedMarineInfluence', value)} onOverride={() => markAsOverridden('detailedMarineInfluence')} isAutoFilled={wasAutoFilled('detailedMarineInfluence')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="Extreme Marine">Extreme (≤0.5km)</option>
                    <option value="Severe Marine">Severe (0.5-1km)</option>
                    <option value="High Marine">High (1-5km)</option>
                    <option value="Moderate Marine">Moderate (5-20km)</option>
                    <option value="Low / Non-Marine">Low (&gt;20km)</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Air Salt Content</label>
                  <AutoFilledDisplay value={globalSpecs?.airSaltContent ? `${globalSpecs.airSaltContent.level} (${globalSpecs.airSaltContent.isoCategory})` : undefined} isAutoFilled={wasAutoFilled('airSaltContent')} label="Auto" />
                </div>
              </div>
              {/* Marine & Special Conditions - Compact Row 2 */}
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <label className="block text-xs text-gray-600">Flood Risk</label>
                  <AutoFilledSelect value={globalSpecs?.floodRisk || ''} onChange={(value) => updateEnvironmentalField('floodRisk', value)} onOverride={() => markAsOverridden('floodRisk')} isAutoFilled={wasAutoFilled('floodRisk')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Industrial Pollution</label>
                  <AutoFilledSelect value={globalSpecs?.ecpIndustrialPollution || ''} onChange={(value) => updateEnvironmentalField('ecpIndustrialPollution', value)} onOverride={() => markAsOverridden('ecpIndustrialPollution')} isAutoFilled={wasAutoFilled('ecpIndustrialPollution')} disabled={isEnvironmentalLocked}>
                    <option value="">Select...</option>
                    <option value="Unknown">Unknown</option>
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </AutoFilledSelect>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Time of Wetness</label>
                  <AutoFilledDisplay value={globalSpecs?.timeOfWetness ? `${globalSpecs.timeOfWetness.level} (${globalSpecs.timeOfWetness.isoCategory})` : undefined} isAutoFilled={wasAutoFilled('timeOfWetness')} label="Auto" />
                </div>
              </div>
            </div>

            {/* HIDDEN: Corrosion Severity Classification - Hidden per user request, may be used in this area or another area in future */}
            <div className="hidden bg-white rounded-lg p-5 mb-4 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Corrosion Severity Classification
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Soil Corrosivity (AMPP SP0169)
                  </label>
                  <select
                    value={rfqData.soilCorrosivity || ''}
                    onChange={(e) => onUpdate('soilCorrosivity', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select soil corrosivity...</option>
                    <option value="Unknown">Unknown / Not Tested</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderately Corrosive</option>
                    <option value="Severe">Severely Corrosive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ISO 12944 Corrosivity Category
                  </label>
                  <select
                    value={globalSpecs?.ecpIso12944Category || ''}
                    onChange={(e) => {
                      const value = e.target.value || undefined;
                      console.log('🌍 ISO 12944 Category selected:', value);
                      updateEnvironmentalField('ecpIso12944Category', value);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select ISO 12944 category...</option>
                    <option value="Unknown">Unknown / To Be// Determined</option>
                    <option value="C1">C1 - Very Low</option>
                    <option value="C2">C2 - Low</option>
                    <option value="C3">C3 - Medium</option>
                    <option value="C4">C4 - High</option>
                    <option value="C5-I">C5-I - Very High (Industrial)</option>
                    <option value="C5-M">C5-M - Very High (Marine)</option>
                    <option value="CX">CX - Extreme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Overall Environment Severity
                </label>
                <select
                  value={rfqData.environmentSeverity || ''}
                  onChange={(e) => onUpdate('environmentSeverity', e.target.value || undefined)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select overall severity...</option>
                  <option value="Unknown">Unknown / To Be Assessed</option>
                  <option value="Low">Low - Benign conditions</option>
                  <option value="Moderate">Moderate - Standard protection required</option>
                  <option value="High">High - Enhanced protection required</option>
                  <option value="Severe">Severe - Maximum protection required</option>
                </select>
              </div>
            </div>

            {/* HIDDEN: Coating System Recommendations (ISO 21809) - Hidden for now, will be shown on a different page */}
            <div className="hidden bg-white rounded-lg p-5 mb-4 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Coating System Recommendations (ISO 21809)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Suitable External Coating Families
                  </label>
                  <select
                    value={rfqData.recommendedCoatingFamily || ''}
                    onChange={(e) => onUpdate('recommendedCoatingFamily', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select recommended coating...</option>
                    <option value="FBE">FBE (Fusion Bonded Epoxy)</option>
                    <option value="2LPE">2LPE (2-Layer Polyethylene)</option>
                    <option value="3LPE">3LPE (3-Layer Polyethylene)</option>
                    <option value="3LPP">3LPP (3-Layer Polypropylene)</option>
                    <option value="PU">Polyurethane Coating</option>
                    <option value="Coal Tar Enamel">Coal Tar Enamel</option>
                    <option value="Concrete Weight">Concrete Weight Coating</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Minimum Coating Thickness
                  </label>
                  <select
                    value={rfqData.minCoatingThickness || ''}
                    onChange={(e) => onUpdate('minCoatingThickness', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select minimum thickness...</option>
                    <option value="≥0.3mm">≥0.3mm (FBE Standard)</option>
                    <option value="≥0.5mm">≥0.5mm (FBE Enhanced)</option>
                    <option value="≥1.8mm">≥1.8mm (2LPE)</option>
                    <option value="≥2.5mm">≥2.5mm (3LPE Standard)</option>
                    <option value="≥3.0mm">≥3.0mm (3LPE/3LPP Enhanced)</option>
                    <option value="≥3.5mm">≥3.5mm (3LPP High Performance)</option>
                    <option value="≥5.0mm">≥5.0mm (Severe conditions)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Surface Preparation Standard
                  </label>
                  <select
                    value={rfqData.surfacePrep || ''}
                    onChange={(e) => onUpdate('surfacePrep', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select surface prep...</option>
                    <option value="SSPC-SP6">SSPC-SP6 / Sa 2 (Commercial Blast)</option>
                    <option value="SSPC-SP10">SSPC-SP10 / Sa 2½ (Near-White Blast)</option>
                    <option value="SSPC-SP5">SSPC-SP5 / Sa 3 (White Metal Blast)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cathodic Protection Compatibility
                  </label>
                  <select
                    value={rfqData.cpCompatibility || ''}
                    onChange={(e) => onUpdate('cpCompatibility', e.target.value || undefined)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select CP requirement...</option>
                    <option value="Required">CP Required - Coating must be compatible</option>
                    <option value="Recommended">CP Recommended</option>
                    <option value="Not Required">CP Not Required</option>
                    <option value="TBD">To Be// Determined</option>
                  </select>
                </div>
              </div>

              {/* Additional Protection Flags */}
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Additional Protection Requirements
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresConcreteCoating || false}
                      onChange={(e) => onUpdate('requiresConcreteCoating', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Concrete Coating</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresRockShield || false}
                      onChange={(e) => onUpdate('requiresRockShield', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Rock Shield</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresHolidayDetection || false}
                      onChange={(e) => onUpdate('requiresHolidayDetection', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Holiday Detection</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={rfqData.requiresFieldJointCoating || false}
                      onChange={(e) => onUpdate('requiresFieldJointCoating', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Field Joint Coating</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Engineering Disclaimer */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h5 className="text-sm font-bold text-amber-800 mb-1">Engineering Disclaimer & Traceability</h5>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Environmental and coating recommendations are <strong>indicative</strong> and based on generalized datasets
                    and standards interpretations (ISO 12944, ISO 21809, AMPP SP0169, ISO 9223). Final coating selection
                    <strong> must be validated</strong> by project-specific soil investigations, climate data, and applicable
                    governing codes. These outputs do not replace detailed corrosion engineering studies.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">ISO 12944</span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">ISO 21809</span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">AMPP SP0169</span>
                    <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded">ISO 9223</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Environmental Confirmation Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              {!environmentalConfirmed ? (
                <button
                  type="button"
                  onClick={handleConfirmEnvironmental}
                  disabled={!hasRequiredEnvironmentalData()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Environmental Data
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Environmental Data Confirmed
                  </div>
                  {!isEditingEnvironmental ? (
                    <button
                      type="button"
                      onClick={handleEditEnvironmental}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmEnvironmental}
                      disabled={!hasRequiredEnvironmentalData()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
                    >
                      Re-confirm Changes
                    </button>
                  )}
                </div>
              )}
              {!hasRequiredEnvironmentalData() && !environmentalConfirmed && (
                <p className="mt-2 text-sm text-amber-600">
                  Please fill in all required environmental fields to confirm this section.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Supporting Documents Section - At Bottom - Compact */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-600 rounded">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Supporting Documents</h3>
              <p className="text-xs text-gray-600">Specifications, drawings, or requirements</p>
            </div>
          </div>

          {!documentsConfirmed ? (
            <>
              <RfqDocumentUpload
                documents={pendingDocuments || []}
                onAddDocument={onAddDocument}
                onRemoveDocument={onRemoveDocument}
                maxDocuments={10}
                maxFileSizeMB={50}
              />

              <div className="mt-3 pt-2 border-t border-purple-200">
                <button
                  type="button"
                  onClick={() => {
                    if (!pendingDocuments || pendingDocuments.length === 0) {
                      setShowNoDocumentsPopup(true);
                    } else {
                      setDocumentsConfirmed(true);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Documents
                </button>
              </div>
            </>
          ) : (
            <div className="bg-green-50 border border-green-400 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Confirmed ({pendingDocuments?.length || 0} file{(pendingDocuments?.length || 0) !== 1 ? 's' : ''})
                </div>
                <button
                  type="button"
                  onClick={() => setDocumentsConfirmed(false)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                >
                  Edit
                </button>
              </div>
              {pendingDocuments && pendingDocuments.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {pendingDocuments.map((doc: any, idx: number) => (
                    <span key={idx} className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {(doc.name || doc.file?.name)?.substring(0, 20)}...
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* No Documents Confirmation Popup */}
      {showNoDocumentsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Documents Uploaded</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You haven't uploaded any supporting documents. Documents such as specifications, drawings, or requirements help suppliers provide accurate quotes.
            </p>
            <p className="text-gray-700 font-medium mb-4">
              Would you like to proceed without uploading documents?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  console.log('📄 User confirmed: Skip documents');
                  setShowNoDocumentsPopup(false);
                  setDocumentsConfirmed(true);
                  onUpdate('skipDocuments', true);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Proceed Without Documents
              </button>
              <button
                type="button"
                onClick={() => setShowNoDocumentsPopup(false)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mine Modal */}
      <AddMineModal
        isOpen={showAddMineModal}
        onClose={() => setShowAddMineModal(false)}
        onMineCreated={handleMineCreated}
      />
    </div>
  );
}
