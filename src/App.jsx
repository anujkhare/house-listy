import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Home, Plus, X, Eye, EyeOff, Star, Filter, List, Map as MapIcon, Edit2, Trash2, ExternalLink, Check, AlertCircle, Heart, ThumbsDown, XCircle, Download, Upload } from 'lucide-react';
import './storage';
import { parseZillowListing, extractFromZillowUrl } from './zillowParser';

// Geocoding function using Nominatim (free, no API key)
const geocodeAddress = async (address) => {
  try {
    // Try different address formats
    const addressVariations = [
      address, // Original format
      address.replace(/\s*APT\s*\d+/gi, ''), // Remove apartment number
      address.replace(/\s*#\d+/gi, ''), // Remove unit number with #
      address.replace(/\s*UNIT\s*\d+/gi, '') // Remove UNIT number
    ];

    for (const addressVariant of addressVariations) {
      const trimmedAddress = addressVariant.trim();
      if (!trimmedAddress) continue;

      console.log(`Trying geocode for: ${trimmedAddress}`);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedAddress)}&limit=1`,
        { headers: { 'User-Agent': 'HouseHuntingTracker/1.0' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        console.log(`✓ Geocoded successfully: ${trimmedAddress}`);
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }

      // Wait a bit between attempts to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✗ All geocoding attempts failed for: ${address}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// San Francisco default center
const SF_CENTER = { lat: 37.7749, lng: -122.4194 };

export default function HouseHuntingTracker() {
  const [listings, setListings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showVisitedOnly, setShowVisitedOnly] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Load listings from storage
  useEffect(() => {
    const loadListings = async () => {
      try {
        const result = await window.storage.get('house-listings');
        if (result && result.value) {
          setListings(JSON.parse(result.value));
        }
      } catch (error) {
        console.log('No existing listings found');
      }
      setIsLoading(false);
    };
    loadListings();
  }, []);

  // Listen for data from Chrome extension via bridge content script
  useEffect(() => {
    const handleExtensionMessage = (event) => {
      // Only accept messages from our extension
      if (event.data && event.data.source === 'house-hunter-extension') {
        console.log('App received data from extension:', event.data.payload);

        // Open the add modal with the extension data
        setShowAddModal(true);

        // Auto-fill the form after modal opens
        setTimeout(() => {
          const customEvent = new CustomEvent('extensionData', {
            detail: event.data.payload
          });
          window.dispatchEvent(customEvent);
        }, 100);
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  // Listen for CSV import events
  useEffect(() => {
    const handleImportListings = (event) => {
      const importedListings = event.detail;
      setListings(prev => [...prev, ...importedListings]);
      alert(`Successfully imported ${importedListings.length} listings!`);
    };

    window.addEventListener('importListings', handleImportListings);
    return () => window.removeEventListener('importListings', handleImportListings);
  }, []);

  // Save listings to storage
  useEffect(() => {
    if (!isLoading) {
      const saveListings = async () => {
        try {
          await window.storage.set('house-listings', JSON.stringify(listings));
        } catch (error) {
          console.error('Error saving listings:', error);
        }
      };
      saveListings();
    }
  }, [listings, isLoading]);

  // Initialize map
  useEffect(() => {
    if (viewMode !== 'map') return;
    if (mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapRef.current || !window.L) {
        console.log('Map ref or Leaflet not ready');
        return false;
      }

      // Check if container has dimensions (is actually rendered)
      const container = mapRef.current;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log('Container not ready, dimensions:', rect.width, rect.height);
        return false;
      }

      // Clean up any existing Leaflet state before initializing
      if (container._leaflet_id) {
        delete container._leaflet_id;
      }
      container.innerHTML = '';

      try {
        console.log('Initializing map...');
        const map = window.L.map(mapRef.current).setView([SF_CENTER.lat, SF_CENTER.lng], 12);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapReady(true);
        console.log('Map initialized successfully');
        return true;
      } catch (error) {
        console.error('Map initialization error:', error);
        return false;
      }
    };

    const tryInitMap = (retries = 0, maxRetries = 10) => {
      const success = initMap();
      if (!success && retries < maxRetries) {
        console.log(`Retrying map initialization (attempt ${retries + 1}/${maxRetries})...`);
        setTimeout(() => tryInitMap(retries + 1, maxRetries), 200);
      }
    };

    // Load Leaflet CSS and JS
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        console.log('Leaflet loaded');
        tryInitMap();
      };
      document.head.appendChild(script);
    } else {
      // Leaflet already loaded, try to init
      tryInitMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.log('Error removing map:', e);
        }
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [viewMode]);

  // Update markers when listings change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const filteredListings = showVisitedOnly
      ? listings.filter(l => l.visited)
      : listings;

    filteredListings.forEach(listing => {
      if (listing.lat && listing.lng) {
        let iconHtml;

        if (listing.visited && listing.sentiment === 'liked') {
          // Green checkmark for liked
          iconHtml = `<div style="background: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
        } else if (listing.visited && listing.sentiment === 'disliked') {
          // Red X for disliked
          iconHtml = `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>`;
        } else if (listing.visited) {
          // Gray checkmark for visited but no sentiment
          iconHtml = `<div style="background: #6b7280; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
        } else {
          // Blue house for not visited
          iconHtml = `<div style="background: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>`;
        }

        const icon = window.L.divIcon({
          html: iconHtml,
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        // Create popup content with price info
        const priceText = listing.price ? `$${listing.price.toLocaleString()}` : 'N/A';
        const pricePerSqftText = listing.pricePerSqft ? `$${listing.pricePerSqft.toLocaleString()}/sqft` : 'N/A';

        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #111827;">${listing.address}</div>
            <div style="display: flex; gap: 12px; margin-bottom: 4px;">
              <div>
                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Price</div>
                <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${priceText}</div>
              </div>
              <div>
                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">$/Sqft</div>
                <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${pricePerSqftText}</div>
              </div>
            </div>
            ${listing.beds || listing.baths ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${listing.beds || '?'} beds • ${listing.baths || '?'} baths</div>` : ''}
            ${listing.zillowUrl ? `<a href="${listing.zillowUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; padding: 6px 12px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500; transition: background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              View on Zillow
            </a>` : ''}
          </div>
        `;

        const marker = window.L.marker([listing.lat, listing.lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
          })
          .on('click', () => setSelectedListing(listing));

        markersRef.current.push(marker);
      }
    });

    // Fit bounds if there are markers
    if (markersRef.current.length > 0) {
      const group = window.L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [listings, showVisitedOnly, mapReady]);

  const handleAddListing = async (formData) => {
    const coords = await geocodeAddress(formData.address + ', San Francisco, CA');
    const newListing = {
      id: Date.now().toString(),
      ...formData,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      visited: false,
      sentiment: null, // null, 'liked', or 'disliked'
      createdAt: new Date().toISOString(),
      likes: [],
      dislikes: [],
      dealBreakers: []
    };
    setListings(prev => [...prev, newListing]);
    setShowAddModal(false);
  };

  const handleUpdateListing = async (updatedListing) => {
    // If address changed and no coordinates, geocode it
    const originalListing = listings.find(l => l.id === updatedListing.id);
    if (originalListing?.address !== updatedListing.address || (!updatedListing.lat || !updatedListing.lng)) {
      const coords = await geocodeAddress(updatedListing.address + ', San Francisco, CA');
      if (coords) {
        updatedListing.lat = coords.lat;
        updatedListing.lng = coords.lng;
      }
    }

    setListings(prev => prev.map(l => l.id === updatedListing.id ? updatedListing : l));
    setShowEditModal(false);
    setEditingListing(null);
    if (selectedListing?.id === updatedListing.id) {
      setSelectedListing(updatedListing);
    }
  };

  const handleDeleteListing = (id) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      setListings(prev => prev.filter(l => l.id !== id));
      if (selectedListing?.id === id) setSelectedListing(null);
      return true;
    }
    return false;
  };

  const toggleVisited = (id) => {
    setListings(prev => prev.map(l =>
      l.id === id ? { ...l, visited: !l.visited } : l
    ));
    // Update selectedListing if it's the one being toggled
    if (selectedListing?.id === id) {
      setSelectedListing(prev => ({ ...prev, visited: !prev.visited }));
    }
  };

  const setSentiment = (id, sentiment) => {
    setListings(prev => prev.map(l =>
      l.id === id ? { ...l, sentiment, visited: true } : l
    ));
    // Update selectedListing if it's the one being changed
    if (selectedListing?.id === id) {
      setSelectedListing(prev => ({ ...prev, sentiment, visited: true }));
    }
  };

  const filteredListings = showVisitedOnly
    ? listings.filter(l => l.visited)
    : listings;

  const fixMissingCoordinates = async () => {
    const listingsWithoutCoords = listings.filter(l => !l.lat || !l.lng);
    if (listingsWithoutCoords.length === 0) {
      alert('All listings already have coordinates!');
      return;
    }

    if (!confirm(`Found ${listingsWithoutCoords.length} listing(s) without coordinates. Geocode them now?`)) {
      return;
    }

    for (const listing of listingsWithoutCoords) {
      console.log(`Geocoding ${listing.address}...`);
      const coords = await geocodeAddress(listing.address + ', San Francisco, CA');
      if (coords) {
        listing.lat = coords.lat;
        listing.lng = coords.lng;
        console.log(`✓ Geocoded ${listing.address}`);
      } else {
        console.log(`✗ Failed to geocode ${listing.address}`);
      }
      // Rate limit to avoid overwhelming the geocoding service
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setListings([...listings]);
    alert('Geocoding complete! Check console for details.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading your listings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">SF House Hunter</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {listings.length} listings • {listings.filter(l => l.visited).length} visited
          </span>
          {listings.filter(l => !l.lat || !l.lng).length > 0 && (
            <button
              onClick={fixMissingCoordinates}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition"
              title="Fix listings without map coordinates"
            >
              <MapPin className="w-3 h-3" />
              Fix {listings.filter(l => !l.lat || !l.lng).length} missing
            </button>
          )}
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === 'map' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MapIcon className="w-4 h-4" /> Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <button
            onClick={() => setShowVisitedOnly(!showVisitedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              showVisitedOnly ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {showVisitedOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showVisitedOnly ? 'Visited Only' : 'All Listings'}
          </button>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Add Listing
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'map' ? (
          <>
            {/* Map */}
            <div className="flex-1 relative">
              <div ref={mapRef} className="absolute inset-0" />
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-gray-500">Loading map...</div>
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            {selectedListing && (
              <ListingDetail
                listing={selectedListing}
                onClose={() => setSelectedListing(null)}
                onEdit={() => { setEditingListing(selectedListing); setShowEditModal(true); }}
                onDelete={() => handleDeleteListing(selectedListing.id)}
                onToggleVisited={() => toggleVisited(selectedListing.id)}
                onSetSentiment={(sentiment) => setSentiment(selectedListing.id, sentiment)}
              />
            )}
          </>
        ) : (
          <ListView
            listings={filteredListings}
            onEdit={(listing) => { setEditingListing(listing); setShowEditModal(true); }}
            onDelete={handleDeleteListing}
            onToggleVisited={toggleVisited}
            onSetSentiment={setSentiment}
          />
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddListingModal 
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddListing}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingListing && (
        <EditListingModal 
          listing={editingListing}
          onClose={() => { setShowEditModal(false); setEditingListing(null); }}
          onSave={handleUpdateListing}
          onDelete={(id) => {
            const didDelete = handleDeleteListing(id);
            if (didDelete) {
              setShowEditModal(false);
              setEditingListing(null);
            }
          }}
        />
      )}

      <style>{`
        .custom-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px; }
      `}</style>
    </div>
  );
}

function ListingDetail({ listing, onClose, onEdit, onDelete, onToggleVisited, onSetSentiment }) {
  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Listing Details</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900">{listing.address}</h3>
            <div className="flex gap-1">
              {listing.visited && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Visited
                </span>
              )}
              {listing.sentiment === 'liked' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Liked
                </span>
              )}
              {listing.sentiment === 'disliked' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  Disliked
                </span>
              )}
            </div>
          </div>
          {listing.neighborhood && (
            <p className="text-sm text-gray-500">{listing.neighborhood}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Price</div>
            <div className="text-lg font-semibold text-gray-900">
              ${listing.price?.toLocaleString() || 'N/A'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">$/sqft</div>
            <div className="text-lg font-semibold text-gray-900">
              ${listing.pricePerSqft?.toLocaleString() || 'N/A'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Beds</div>
            <div className="text-lg font-semibold text-gray-900">{listing.beds || 'N/A'}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Baths</div>
            <div className="text-lg font-semibold text-gray-900">{listing.baths || 'N/A'}</div>
          </div>
        </div>

        {listing.sqft && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Square Feet</div>
            <div className="text-lg font-semibold text-gray-900">{listing.sqft?.toLocaleString()}</div>
          </div>
        )}

        {/* Additional Financial Details */}
        {(listing.taxAssessedValue || listing.annualTaxAmount || listing.priceRange || listing.dateOnMarket || listing.listingAgreement || listing.listingTerms) && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Financial & Listing Details</h4>
            <div className="grid grid-cols-2 gap-3">
              {listing.taxAssessedValue && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Tax Assessed</div>
                  <div className="text-sm font-semibold text-gray-900">
                    ${parseInt(listing.taxAssessedValue)?.toLocaleString() || listing.taxAssessedValue}
                  </div>
                </div>
              )}
              {listing.annualTaxAmount && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Annual Tax</div>
                  <div className="text-sm font-semibold text-gray-900">
                    ${parseInt(listing.annualTaxAmount)?.toLocaleString() || listing.annualTaxAmount}
                  </div>
                </div>
              )}
            </div>
            {listing.priceRange && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Price Range</div>
                <div className="text-sm font-semibold text-gray-900">{listing.priceRange}</div>
              </div>
            )}
            {listing.dateOnMarket && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Date on Market</div>
                <div className="text-sm font-semibold text-gray-900">{listing.dateOnMarket}</div>
              </div>
            )}
            {listing.listingAgreement && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Listing Agreement</div>
                <div className="text-sm font-semibold text-gray-900">{listing.listingAgreement}</div>
              </div>
            )}
            {listing.listingTerms && (
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Listing Terms</div>
                <div className="text-sm text-gray-900">{listing.listingTerms}</div>
              </div>
            )}
          </div>
        )}

        {/* Property & Construction Details */}
        {(listing.lotSize || listing.homeType || listing.yearBuilt || listing.totalSpaces || listing.garageSpaces) && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Property Details</h4>
            <div className="grid grid-cols-2 gap-3">
              {listing.homeType && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Home Type</div>
                  <div className="text-sm font-semibold text-gray-900">{listing.homeType}</div>
                </div>
              )}
              {listing.yearBuilt && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Year Built</div>
                  <div className="text-sm font-semibold text-gray-900">{listing.yearBuilt}</div>
                </div>
              )}
              {listing.lotSize && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Lot Size</div>
                  <div className="text-sm font-semibold text-gray-900">{listing.lotSize}</div>
                </div>
              )}
              {listing.totalSpaces && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Total Spaces</div>
                  <div className="text-sm font-semibold text-gray-900">{listing.totalSpaces}</div>
                </div>
              )}
              {listing.garageSpaces && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Garage Spaces</div>
                  <div className="text-sm font-semibold text-gray-900">{listing.garageSpaces}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {listing.zillowUrl && (
          <a 
            href={listing.zillowUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> View on Zillow
          </a>
        )}

        {listing.likes?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 mb-2">
              <Heart className="w-4 h-4" /> Things I Liked
            </div>
            <ul className="space-y-1">
              {listing.likes.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-green-500">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {listing.dislikes?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 mb-2">
              <ThumbsDown className="w-4 h-4" /> Dislikes (Liveable)
            </div>
            <ul className="space-y-1">
              {listing.dislikes.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-amber-500">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {listing.dealBreakers?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 mb-2">
              <XCircle className="w-4 h-4" /> Deal Breakers
            </div>
            <ul className="space-y-1">
              {listing.dealBreakers.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-red-500">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {listing.notes && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
            <p className="text-sm text-gray-600">{listing.notes}</p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 space-y-3">
          {/* Like/Dislike Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onSetSentiment(listing.sentiment === 'liked' ? null : 'liked')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                listing.sentiment === 'liked'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              <Heart className="w-4 h-4" />
              {listing.sentiment === 'liked' ? 'Liked' : 'Like'}
            </button>
            <button
              onClick={() => onSetSentiment(listing.sentiment === 'disliked' ? null : 'disliked')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                listing.sentiment === 'disliked'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              {listing.sentiment === 'disliked' ? 'Disliked' : 'Dislike'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onToggleVisited}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                listing.visited
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Check className="w-4 h-4" />
              {listing.visited ? 'Mark Unvisited' : 'Mark Visited'}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ listings, onEdit, onDelete, onToggleVisited, onSetSentiment }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const fileInputRef = useRef(null);

  const formatText = (value) => (value || value === 0 ? value : '—');
  const formatNumber = (value) => (value || value === 0 ? value.toLocaleString() : '—');
  const formatCurrency = (value) => (value || value === 0 ? `$${Number(value).toLocaleString()}` : '—');

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const downloadCSV = () => {
    // Define CSV headers
    const headers = [
      'Address', 'Zillow URL', 'Neighborhood', 'Likes', 'Dislikes', 'Deal Breakers',
      'Price', 'Beds', 'Baths', 'Sqft', 'Price Per Sqft', 'Tax Assessed Value',
      'Annual Tax Amount', 'Price Range', 'Date on Market', 'Listing Agreement',
      'Listing Terms', 'Lot Size', 'Total Spaces', 'Garage Spaces', 'Home Type',
      'Year Built', 'Visited', 'Sentiment', 'Notes'
    ];

    // Convert listings to CSV rows
    const rows = listings.map(listing => [
      listing.address || '',
      listing.zillowUrl || '',
      listing.neighborhood || '',
      listing.likes?.join('; ') || '',
      listing.dislikes?.join('; ') || '',
      listing.dealBreakers?.join('; ') || '',
      listing.price || '',
      listing.beds || '',
      listing.baths || '',
      listing.sqft || '',
      listing.pricePerSqft || '',
      listing.taxAssessedValue || '',
      listing.annualTaxAmount || '',
      listing.priceRange || '',
      listing.dateOnMarket || '',
      listing.listingAgreement || '',
      listing.listingTerms || '',
      listing.lotSize || '',
      listing.totalSpaces || '',
      listing.garageSpaces || '',
      listing.homeType || '',
      listing.yearBuilt || '',
      listing.visited ? 'Yes' : 'No',
      listing.sentiment || '',
      listing.notes || ''
    ]);

    // Escape CSV fields
    const escapeCSV = (field) => {
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `house-listings-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');

        if (lines.length < 2) {
          alert('CSV file is empty or invalid');
          return;
        }

        // Skip header row
        const dataLines = lines.slice(1).filter(line => line.trim());

        // Parse CSV (simple parser - handles quoted fields)
        const parseCSVLine = (line) => {
          const fields = [];
          let field = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                field += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              fields.push(field);
              field = '';
            } else {
              field += char;
            }
          }
          fields.push(field);
          return fields;
        };

        const importedListings = dataLines.map(line => {
          const fields = parseCSVLine(line);
          return {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
            address: fields[0] || '',
            zillowUrl: fields[1] || '',
            neighborhood: fields[2] || '',
            likes: fields[3] ? fields[3].split('; ').filter(x => x) : [],
            dislikes: fields[4] ? fields[4].split('; ').filter(x => x) : [],
            dealBreakers: fields[5] ? fields[5].split('; ').filter(x => x) : [],
            price: fields[6] ? parseInt(fields[6]) : null,
            beds: fields[7] ? parseInt(fields[7]) : null,
            baths: fields[8] ? parseFloat(fields[8]) : null,
            sqft: fields[9] ? parseInt(fields[9]) : null,
            pricePerSqft: fields[10] ? parseInt(fields[10]) : null,
            taxAssessedValue: fields[11] || null,
            annualTaxAmount: fields[12] || null,
            priceRange: fields[13] || '',
            dateOnMarket: fields[14] || '',
            listingAgreement: fields[15] || '',
            listingTerms: fields[16] || '',
            lotSize: fields[17] || '',
            totalSpaces: fields[18] ? parseInt(fields[18]) : null,
            garageSpaces: fields[19] ? parseInt(fields[19]) : null,
            homeType: fields[20] || '',
            yearBuilt: fields[21] ? parseInt(fields[21]) : null,
            visited: fields[22] === 'Yes',
            sentiment: fields[23] || null,
            notes: fields[24] || '',
            lat: null,
            lng: null,
            createdAt: new Date().toISOString()
          };
        });

        if (confirm(`Import ${importedListings.length} listings from CSV? This will add them to your existing listings.`)) {
          // Trigger a custom event to add listings
          window.dispatchEvent(new CustomEvent('importListings', {
            detail: importedListings
          }));
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the format.');
      }
    };

    reader.readAsText(file);
    // Reset input so the same file can be uploaded again
    event.target.value = '';
  };

  const getSortedListings = () => {
    if (!sortConfig.key) return listings;

    const sorted = [...listings].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Handle array fields (likes, dislikes, dealBreakers)
      if (Array.isArray(aVal)) {
        aVal = aVal.length;
        bVal = bVal.length;
      }

      // Handle boolean fields (visited)
      if (typeof aVal === 'boolean') {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      }

      // Handle string comparison (case-insensitive)
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 transition select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span className="text-xs">
            {sortConfig.direction === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );

  if (listings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No listings yet</p>
          <p className="text-sm">Add your first listing to get started</p>
        </div>
      </div>
    );
  }

  const sortedListings = getSortedListings();

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="bg-white border border-gray-200 rounded-xl">
        {/* CSV Import/Export Controls */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {listings.length} listing{listings.length !== 1 ? 's' : ''}
            {sortConfig.key && (
              <span className="ml-2 text-gray-400">
                • Sorted by {sortConfig.key} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
              title="Download listings as CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              title="Import listings from CSV"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[2200px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
              <tr>
                <SortableHeader label="Address" sortKey="address" />
                <th className="px-3 py-2 font-medium">Zillow</th>
                <SortableHeader label="Neighborhood" sortKey="neighborhood" />
                <SortableHeader label="Likes" sortKey="likes" />
                <SortableHeader label="Dislikes" sortKey="dislikes" />
                <SortableHeader label="Deal Breakers" sortKey="dealBreakers" />
                <SortableHeader label="Price" sortKey="price" />
                <SortableHeader label="Beds" sortKey="beds" />
                <SortableHeader label="Baths" sortKey="baths" />
                <SortableHeader label="Sqft" sortKey="sqft" />
                <SortableHeader label="$/Sqft" sortKey="pricePerSqft" />
                <SortableHeader label="Tax Assessed" sortKey="taxAssessedValue" />
                <SortableHeader label="Annual Tax" sortKey="annualTaxAmount" />
                <SortableHeader label="Price Range" sortKey="priceRange" />
                <SortableHeader label="Date on Market" sortKey="dateOnMarket" />
                <SortableHeader label="Listing Agreement" sortKey="listingAgreement" />
                <SortableHeader label="Listing Terms" sortKey="listingTerms" />
                <SortableHeader label="Lot Size" sortKey="lotSize" />
                <SortableHeader label="Total Spaces" sortKey="totalSpaces" />
                <SortableHeader label="Garage Spaces" sortKey="garageSpaces" />
                <SortableHeader label="Home Type" sortKey="homeType" />
                <SortableHeader label="Year Built" sortKey="yearBuilt" />
                <SortableHeader label="Visited" sortKey="visited" />
                <SortableHeader label="Sentiment" sortKey="sentiment" />
                <SortableHeader label="Notes" sortKey="notes" />
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {sortedListings.map(listing => (
                <tr
                  key={listing.id}
                  className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer"
                  onClick={() => onEdit(listing)}
                >
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{formatText(listing.address)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {listing.zillowUrl ? (
                      <a
                        href={listing.zillowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        onClick={event => event.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-xs">Open</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.neighborhood)}</td>
                  <td className="px-3 py-2 whitespace-pre-line max-w-xs">
                    {listing.likes?.length ? listing.likes.join('\n') : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-pre-line max-w-xs">
                    {listing.dislikes?.length ? listing.dislikes.join('\n') : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-pre-line max-w-xs">
                    {listing.dealBreakers?.length ? listing.dealBreakers.join('\n') : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(listing.price)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.beds)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.baths)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatNumber(listing.sqft)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(listing.pricePerSqft)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(listing.taxAssessedValue)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(listing.annualTaxAmount)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.priceRange)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.dateOnMarket)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.listingAgreement)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.listingTerms)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.lotSize)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.totalSpaces)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.garageSpaces)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.homeType)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatText(listing.yearBuilt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {listing.visited ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Visited
                      </span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {listing.sentiment === 'liked' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Liked
                      </span>
                    ) : listing.sentiment === 'disliked' ? (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        Disliked
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[240px] truncate" title={formatText(listing.notes)}>
                    {formatText(listing.notes)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onSetSentiment(listing.id, listing.sentiment === 'liked' ? null : 'liked')}
                        className={`p-2 rounded-lg transition ${
                          listing.sentiment === 'liked' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={listing.sentiment === 'liked' ? 'Remove like' : 'Like'}
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSetSentiment(listing.id, listing.sentiment === 'disliked' ? null : 'disliked')}
                        className={`p-2 rounded-lg transition ${
                          listing.sentiment === 'disliked' ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={listing.sentiment === 'disliked' ? 'Remove dislike' : 'Dislike'}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleVisited(listing.id)}
                        className={`p-2 rounded-lg transition ${
                          listing.visited ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={listing.visited ? 'Mark unvisited' : 'Mark visited'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(listing)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                        title="Edit listing"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(listing.id)}
                        className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddListingModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    address: '',
    neighborhood: '',
    price: '',
    beds: '',
    baths: '',
    sqft: '',
    zillowUrl: '',
    notes: '',
    pricePerSqft: '',
    taxAssessedValue: '',
    annualTaxAmount: '',
    priceRange: '',
    dateOnMarket: '',
    listingAgreement: '',
    listingTerms: '',
    lotSize: '',
    totalSpaces: '',
    garageSpaces: '',
    homeType: '',
    yearBuilt: ''
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Listen for data from Chrome extension
  useEffect(() => {
    const handleExtensionData = (event) => {
      const data = event.detail;
      console.log('Received extension data in modal:', data);

      setFormData(prev => ({
        ...prev,
        address: data.address || prev.address,
        price: data.price || prev.price,
        beds: data.beds || prev.beds,
        baths: data.baths || prev.baths,
        sqft: data.sqft || prev.sqft,
        zillowUrl: data.url || prev.zillowUrl,
        pricePerSqft: data.pricePerSqft || prev.pricePerSqft,
        taxAssessedValue: data.taxAssessedValue || prev.taxAssessedValue,
        annualTaxAmount: data.annualTaxAmount || prev.annualTaxAmount,
        priceRange: data.priceRange || prev.priceRange,
        dateOnMarket: data.dateOnMarket || prev.dateOnMarket,
        listingAgreement: data.listingAgreement || prev.listingAgreement,
        listingTerms: data.listingTerms || prev.listingTerms,
        lotSize: data.lotSize || prev.lotSize,
        totalSpaces: data.totalSpaces || prev.totalSpaces,
        garageSpaces: data.garageSpaces || prev.garageSpaces,
        homeType: data.homeType || prev.homeType,
        yearBuilt: data.yearBuilt || prev.yearBuilt,
      }));
    };

    window.addEventListener('extensionData', handleExtensionData);
    return () => window.removeEventListener('extensionData', handleExtensionData);
  }, []);

  const handleAutoFill = async () => {
    if (!formData.zillowUrl) {
      setFetchError('Please enter a Zillow URL first');
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      // First try to extract from URL structure (this always works)
      const urlData = extractFromZillowUrl(formData.zillowUrl);

      // Then try to parse the page (may fail due to CORS)
      let parsedData = {};
      try {
        parsedData = await parseZillowListing(formData.zillowUrl);
      } catch (error) {
        console.log('Could not fetch page details (CORS blocked), using URL data only');
      }

      // Merge data, preferring parsed data over URL data
      const extractedData = { ...urlData, ...parsedData };

      // Update form with extracted data (only non-empty fields)
      setFormData(prev => ({
        ...prev,
        address: extractedData.address || prev.address,
        price: extractedData.price || prev.price,
        beds: extractedData.beds || prev.beds,
        baths: extractedData.baths || prev.baths,
        sqft: extractedData.sqft || prev.sqft,
      }));

      if (Object.keys(extractedData).length === 0 || !extractedData.address) {
        setFetchError('Could not extract data. Please fill manually.');
      }
    } catch (error) {
      setFetchError('Unable to fetch listing details. Please fill manually.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGeocoding(true);

    const priceNum = parseInt(formData.price.replace(/[^0-9]/g, ''));
    const sqftNum = parseInt(formData.sqft.replace(/[^0-9]/g, ''));

    // Parse numeric values from the new fields
    const pricePerSqftNum = formData.pricePerSqft ? parseInt(formData.pricePerSqft.replace(/[^0-9]/g, '')) : null;
    const taxAssessedValueNum = formData.taxAssessedValue ? parseInt(formData.taxAssessedValue.replace(/[^0-9]/g, '')) : null;
    const annualTaxAmountNum = formData.annualTaxAmount ? parseInt(formData.annualTaxAmount.replace(/[^0-9]/g, '')) : null;

    await onAdd({
      ...formData,
      price: priceNum || null,
      beds: parseInt(formData.beds) || null,
      baths: parseFloat(formData.baths) || null,
      sqft: sqftNum || null,
      pricePerSqft: pricePerSqftNum || (priceNum && sqftNum ? Math.round(priceNum / sqftNum) : null),
      taxAssessedValue: taxAssessedValueNum,
      annualTaxAmount: annualTaxAmountNum,
      totalSpaces: formData.totalSpaces ? parseInt(formData.totalSpaces) : null,
      garageSpaces: formData.garageSpaces ? parseInt(formData.garageSpaces) : null,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
    });
    setIsGeocoding(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Listing</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main St"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
            <input
              type="text"
              value={formData.neighborhood}
              onChange={e => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
              placeholder="Mission, SOMA, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="text"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="1,200,000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sqft</label>
              <input
                type="text"
                value={formData.sqft}
                onChange={e => setFormData(prev => ({ ...prev, sqft: e.target.value }))}
                placeholder="1,500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
              <input
                type="number"
                value={formData.beds}
                onChange={e => setFormData(prev => ({ ...prev, beds: e.target.value }))}
                placeholder="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baths</label>
              <input
                type="number"
                step="0.5"
                value={formData.baths}
                onChange={e => setFormData(prev => ({ ...prev, baths: e.target.value }))}
                placeholder="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zillow URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.zillowUrl}
                onChange={e => setFormData(prev => ({ ...prev, zillowUrl: e.target.value }))}
                placeholder="https://www.zillow.com/homedetails/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={isFetching || !formData.zillowUrl}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Auto-fill from Zillow"
              >
                <Download className="w-4 h-4" />
                {isFetching ? 'Fetching...' : 'Auto-fill'}
              </button>
            </div>
            {fetchError && (
              <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fetchError}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Paste the Zillow URL and click Auto-fill to extract details
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any initial notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Additional Fields Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Details</h3>

            {/* Financial Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Assessed Value</label>
                  <input
                    type="text"
                    value={formData.taxAssessedValue}
                    onChange={e => setFormData(prev => ({ ...prev, taxAssessedValue: e.target.value }))}
                    placeholder="901127"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Tax</label>
                  <input
                    type="text"
                    value={formData.annualTaxAmount}
                    onChange={e => setFormData(prev => ({ ...prev, annualTaxAmount: e.target.value }))}
                    placeholder="11339"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                  <input
                    type="text"
                    value={formData.priceRange}
                    onChange={e => setFormData(prev => ({ ...prev, priceRange: e.target.value }))}
                    placeholder="$2M - $2M"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date on Market</label>
                  <input
                    type="text"
                    value={formData.dateOnMarket}
                    onChange={e => setFormData(prev => ({ ...prev, dateOnMarket: e.target.value }))}
                    placeholder="5/29/2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Agreement</label>
                <input
                  type="text"
                  value={formData.listingAgreement}
                  onChange={e => setFormData(prev => ({ ...prev, listingAgreement: e.target.value }))}
                  placeholder="Excl Right"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Terms</label>
                <input
                  type="text"
                  value={formData.listingTerms}
                  onChange={e => setFormData(prev => ({ ...prev, listingTerms: e.target.value }))}
                  placeholder="Cash, Conventional, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lot Size</label>
                  <input
                    type="text"
                    value={formData.lotSize}
                    onChange={e => setFormData(prev => ({ ...prev, lotSize: e.target.value }))}
                    placeholder="2,500 sqft"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Type</label>
                  <input
                    type="text"
                    value={formData.homeType}
                    onChange={e => setFormData(prev => ({ ...prev, homeType: e.target.value }))}
                    placeholder="Single Family Residence"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Spaces</label>
                  <input
                    type="number"
                    value={formData.totalSpaces}
                    onChange={e => setFormData(prev => ({ ...prev, totalSpaces: e.target.value }))}
                    placeholder="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Garage Spaces</label>
                  <input
                    type="number"
                    value={formData.garageSpaces}
                    onChange={e => setFormData(prev => ({ ...prev, garageSpaces: e.target.value }))}
                    placeholder="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                  <input
                    type="number"
                    value={formData.yearBuilt}
                    onChange={e => setFormData(prev => ({ ...prev, yearBuilt: e.target.value }))}
                    placeholder="1925"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGeocoding}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isGeocoding ? 'Adding...' : 'Add Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditListingModal({ listing, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    ...listing,
    price: listing.price?.toString() || '',
    beds: listing.beds?.toString() || '',
    baths: listing.baths?.toString() || '',
    sqft: listing.sqft?.toString() || '',
    likes: listing.likes || [],
    dislikes: listing.dislikes || [],
    dealBreakers: listing.dealBreakers || []
  });
  const [newLike, setNewLike] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [newDealBreaker, setNewDealBreaker] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const priceNum = parseInt(formData.price.replace(/[^0-9]/g, ''));
    const sqftNum = parseInt(formData.sqft.replace(/[^0-9]/g, ''));
    
    onSave({
      ...formData,
      price: priceNum || null,
      beds: parseInt(formData.beds) || null,
      baths: parseFloat(formData.baths) || null,
      sqft: sqftNum || null,
      pricePerSqft: priceNum && sqftNum ? Math.round(priceNum / sqftNum) : null
    });
  };

  const addItem = (field, value, setValue) => {
    if (value.trim()) {
      setFormData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
      setValue('');
    }
  };

  const addItemsFromText = (field, text, setValue) => {
    if (text.trim()) {
      // Split by newlines, filter empty lines, trim each line
      const items = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (items.length > 0) {
        setFormData(prev => ({ ...prev, [field]: [...prev[field], ...items] }));
        setValue('');
      }
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Listing</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="text"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sqft</label>
              <input
                type="text"
                value={formData.sqft}
                onChange={e => setFormData(prev => ({ ...prev, sqft: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Likes */}
          <div>
            <label className="block text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <Heart className="w-4 h-4" /> Things I Liked
            </label>
            <div className="mb-2">
              <textarea
                value={newLike}
                onChange={e => setNewLike(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    addItemsFromText('likes', newLike, setNewLike);
                  }
                }}
                placeholder="Add things you liked (one per line, or paste multiple lines)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              />
              <button
                type="button"
                onClick={() => addItemsFromText('likes', newLike, setNewLike)}
                className="mt-2 w-full px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
              >
                Add (⌘/Ctrl + Enter)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.likes.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-sm rounded-lg">
                  {item}
                  <button type="button" onClick={() => removeItem('likes', i)} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Dislikes */}
          <div>
            <label className="block text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
              <ThumbsDown className="w-4 h-4" /> Dislikes (But Liveable)
            </label>
            <div className="mb-2">
              <textarea
                value={newDislike}
                onChange={e => setNewDislike(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    addItemsFromText('dislikes', newDislike, setNewDislike);
                  }
                }}
                placeholder="Add minor issues (one per line, or paste multiple lines)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
              <button
                type="button"
                onClick={() => addItemsFromText('dislikes', newDislike, setNewDislike)}
                className="mt-2 w-full px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm font-medium"
              >
                Add (⌘/Ctrl + Enter)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.dislikes.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-sm rounded-lg">
                  {item}
                  <button type="button" onClick={() => removeItem('dislikes', i)} className="hover:text-amber-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Deal Breakers */}
          <div>
            <label className="block text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Deal Breakers
            </label>
            <div className="mb-2">
              <textarea
                value={newDealBreaker}
                onChange={e => setNewDealBreaker(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    addItemsFromText('dealBreakers', newDealBreaker, setNewDealBreaker);
                  }
                }}
                placeholder="Add deal breakers (one per line, or paste multiple lines)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
              <button
                type="button"
                onClick={() => addItemsFromText('dealBreakers', newDealBreaker, setNewDealBreaker)}
                className="mt-2 w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Add (⌘/Ctrl + Enter)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.dealBreakers.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-sm rounded-lg">
                  {item}
                  <button type="button" onClick={() => removeItem('dealBreakers', i)} className="hover:text-red-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onDelete(listing.id)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
