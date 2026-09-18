/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  Box,
  Image as ImageIcon,
  Wand2,
  Layers,
  Plus,
  Trash2,
  Download,
  Sparkles,
  Shirt,
  Maximize,
  ArrowRight,
  Menu,
  X,
  Check,
  Truck,
  MessageSquare,
  Flame,
  Radio,
  Sliders,
  Send,
  RefreshCw,
  Eye,
  Tag,
  Key
} from 'lucide-react';
import { Button } from './components/Button';
import { FileUploader } from './components/FileUploader';
import { BrandLogo } from './components/BrandLogo';
import { IntroSequence } from './components/IntroSequence';
import { CompletefulHub } from './components/CompletefulHub';
import { AiChatDrawer } from './components/AiChatDrawer';
import { generateMockup, generateAsset } from './services/geminiService';
import {
  Asset,
  GeneratedMockup,
  AppView,
  LoadingState,
  PlacedLayer,
  CompletefulShop,
  CompletefulProductLink,
  CompletefulVariantLink,
  CompletefulOrderLink,
  CompletefulOperation,
  CompletefulWebhookSubscription,
  CompletefulWebhookEvent,
  CompletefulConfig
} from './types';
import { INITIAL_ASSETS } from './data/initialAssets';
import {
  DEFAULT_COMPLETEFUL_CONFIG,
  INITIAL_SHOPS,
  INITIAL_PRODUCT_LINKS,
  INITIAL_VARIANT_LINKS,
  INITIAL_ORDER_LINKS,
  INITIAL_OPERATIONS,
  INITIAL_WEBHOOK_SUBSCRIPTIONS,
  INITIAL_WEBHOOK_EVENTS
} from './services/completefulService';
import { useApiKey } from './hooks/useApiKey';
import ApiKeyDialog from './components/ApiKeyDialog';

// --- UI Navigation Button ---
const NavButton = ({
  icon,
  label,
  active,
  onClick,
  badge,
  badgeColor = 'bg-zinc-800 text-zinc-400'
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
  badgeColor?: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-left ${
      active
        ? 'bg-amber-500/15 text-white border-l-2 border-amber-500 shadow-sm'
        : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
    }`}
  >
    <span className={`${active ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'} transition-colors flex-shrink-0`}>
      {icon}
    </span>
    <span className="font-medium text-xs tracking-wide flex-1 truncate">{label}</span>
    {badge !== undefined && (
      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center ${active ? 'bg-amber-500 text-zinc-950' : badgeColor}`}>
        {badge}
      </span>
    )}
  </button>
);

// --- Workflow Stepper ---
const WorkflowStepper = ({
  currentView,
  onViewChange
}: {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}) => {
  const steps = [
    { id: 'assets', label: '1. Blanks & Artwork', number: 1 },
    { id: 'studio', label: '2. Placement & AI Render', number: 2 },
    { id: 'gallery', label: '3. Gallery & Completeful Push', number: 3 },
  ];

  const viewOrder = ['assets', 'studio', 'gallery'];
  const currentIndex = viewOrder.indexOf(currentView);
  const progress = Math.max(0, (currentIndex / (steps.length - 1)) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 hidden md:block animate-fade-in px-4">
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-800 -translate-y-1/2 rounded-full"></div>
        <div
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>

        <div className="relative flex justify-between w-full">
          {steps.map((step, index) => {
            const isCompleted = currentIndex > index;
            const isCurrent = currentIndex === index;

            return (
              <button
                key={step.id}
                onClick={() => onViewChange(step.id as AppView)}
                className="group flex flex-col items-center focus:outline-none relative z-10 cursor-pointer"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-zinc-950 ${
                    isCurrent
                      ? 'border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-110'
                      : isCompleted
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-zinc-800 text-zinc-600 group-hover:border-zinc-600 group-hover:text-zinc-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <span className="text-xs font-bold font-mono">{step.number}</span>
                  )}
                </div>
                <span
                  className={`absolute top-12 text-xs font-medium tracking-wider transition-all duration-300 whitespace-nowrap ${
                    isCurrent ? 'text-amber-400 opacity-100 font-semibold' : isCompleted ? 'text-zinc-400 opacity-80' : 'text-zinc-600 opacity-60 group-hover:opacity-100'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Asset Section Component ---
const AssetSection = ({
  title,
  icon,
  type,
  assets,
  onAdd,
  onRemove,
  validateApiKey,
  onApiError
}: {
  title: string;
  icon: React.ReactNode;
  type: 'logo' | 'product';
  assets: Asset[];
  onAdd: (a: Asset) => void;
  onRemove: (id: string) => void;
  validateApiKey: () => Promise<boolean>;
  onApiError: (e: any) => void;
}) => {
  const [mode, setMode] = useState<'upload' | 'generate'>('upload');
  const [genPrompt, setGenPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!genPrompt) return;
    if (!(await validateApiKey())) return;

    setIsGenerating(true);
    try {
      const b64 = await generateAsset(genPrompt, type);
      onAdd({
        id: Math.random().toString(36).substring(7),
        type,
        name: `F&FT AI ${type === 'logo' ? 'Graphic' : 'Apparel Blank'}`,
        data: b64,
        mimeType: 'image/png'
      });
      setGenPrompt('');
    } catch (e: any) {
      console.error(e);
      onApiError(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col border border-zinc-800/80">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
          <span className="text-amber-400">{icon}</span> {title}
        </h2>
        <span className="text-xs bg-zinc-800/80 px-2 py-0.5 rounded-full text-zinc-400 font-mono">
          {assets.length} items
        </span>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 overflow-y-auto max-h-[360px] pr-1">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="relative group aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 p-2 flex flex-col items-center justify-center hover:border-amber-500/50 transition-colors"
          >
            <img src={asset.data} className="w-full h-full object-contain" alt={asset.name} referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
              <span className="text-[10px] text-zinc-200 line-clamp-2 leading-tight">{asset.name}</span>
              <button
                onClick={() => onRemove(asset.id)}
                className="self-end p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-500 transition-colors shadow"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="col-span-2 sm:col-span-3 flex flex-col items-center justify-center h-32 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            <p className="text-xs">No {type}s loaded</p>
          </div>
        )}
      </div>

      {/* Creation / Upload Area */}
      <div className="mt-auto pt-4 border-t border-zinc-800/80">
        <div className="flex gap-4 mb-3">
          <button
            onClick={() => setMode('upload')}
            className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
              mode === 'upload' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setMode('generate')}
            className={`text-xs font-semibold pb-1 border-b-2 transition-colors flex items-center gap-1 ${
              mode === 'generate' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles size={12} /> Generate with Gemini
          </button>
        </div>

        {mode === 'upload' ? (
          <FileUploader
            label={`Upload ${type === 'logo' ? 'Graphic (PNG/SVG)' : 'Apparel Blank'}`}
            onFileSelect={(f) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                onAdd({
                  id: Math.random().toString(36).substring(7),
                  type,
                  name: f.name,
                  data: e.target?.result as string,
                  mimeType: f.type
                });
              };
              reader.readAsDataURL(f);
            }}
          />
        ) : (
          <div className="space-y-2">
            <textarea
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder={
                type === 'logo'
                  ? 'E.g. Vintage motorcycle club piston emblem with wings and typography...'
                  : 'E.g. Heavyweight oversized washed black streetwear hoodie ghost mannequin...'
              }
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-xs text-white focus:ring-1 focus:ring-amber-500 resize-none h-20 placeholder:text-zinc-600"
            />
            <Button
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={!genPrompt}
              className="w-full text-xs py-2 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-zinc-950 font-bold"
              icon={<Sparkles size={14} />}
            >
              Generate AI {type === 'logo' ? 'Graphic' : 'Garment'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Core Assets & Gallery State
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [generatedMockups, setGeneratedMockups] = useState<GeneratedMockup[]>([]);
  const [selectedMockup, setSelectedMockup] = useState<GeneratedMockup | null>(null);

  // Studio Interactive State
  const [selectedProductId, setSelectedProductId] = useState<string | null>('prod_fft_hoodie_blk');
  const [placedLogos, setPlacedLogos] = useState<PlacedLayer[]>([
    {
      uid: 'init_layer_1',
      assetId: 'logo_fft_main_clear',
      x: 50,
      y: 44,
      scale: 1.1,
      rotation: 0,
      printLocation: 'front'
    }
  ]);
  const [prompt, setPrompt] = useState('Photorealistic DTG ink absorption on heavy fleece with fabric creases and natural studio reflections.');
  const [selectedPrintLocation, setSelectedPrintLocation] = useState<'front' | 'back' | 'sleeve-left' | 'embroidery-chest'>('front');
  const [loading, setLoading] = useState<LoadingState>({ isGenerating: false, message: '' });

  // Completeful Hub State (D1 Models)
  const [completefulConfig, setCompletefulConfig] = useState<CompletefulConfig>(DEFAULT_COMPLETEFUL_CONFIG);
  const [completefulShops, setCompletefulShops] = useState<CompletefulShop[]>(INITIAL_SHOPS);
  const [productLinks, setProductLinks] = useState<CompletefulProductLink[]>(INITIAL_PRODUCT_LINKS);
  const [variantLinks, setVariantLinks] = useState<CompletefulVariantLink[]>(INITIAL_VARIANT_LINKS);
  const [orderLinks, setOrderLinks] = useState<CompletefulOrderLink[]>(INITIAL_ORDER_LINKS);
  const [operations, setOperations] = useState<CompletefulOperation[]>(INITIAL_OPERATIONS);
  const [webhookSubscriptions, setWebhookSubscriptions] = useState<CompletefulWebhookSubscription[]>(INITIAL_WEBHOOK_SUBSCRIPTIONS);
  const [webhookEvents, setWebhookEvents] = useState<CompletefulWebhookEvent[]>(INITIAL_WEBHOOK_EVENTS);

  // API Key Management
  const { showApiKeyDialog, setShowApiKeyDialog, validateApiKey, handleApiKeyDialogContinue } = useApiKey();

  const handleApiError = (error: any) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('Requested entity was not found') ||
      errorMessage.includes('API_KEY_INVALID') ||
      errorMessage.includes('API key not valid') ||
      errorMessage.includes('PERMISSION_DENIED') ||
      errorMessage.includes('403')
    ) {
      setShowApiKeyDialog(true);
    } else {
      alert(`AI Operation Notification: ${errorMessage}`);
    }
  };

  // Canvas Dragging State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedItem, setDraggedItem] = useState<{
    uid: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  // Logo Canvas Helpers
  const addLogoToCanvas = (assetId: string) => {
    const newLayer: PlacedLayer = {
      uid: Math.random().toString(36).substr(2, 9),
      assetId,
      x: 50,
      y: 48,
      scale: 1,
      rotation: 0,
      printLocation: selectedPrintLocation
    };
    setPlacedLogos((prev) => [...prev, newLayer]);
  };

  const removeLogoFromCanvas = (uid: string, e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    setPlacedLogos((prev) => prev.filter((l) => l.uid !== uid));
  };

  const handleStart = (clientX: number, clientY: number, layer: PlacedLayer) => {
    setDraggedItem({
      uid: layer.uid,
      startX: clientX,
      startY: clientY,
      initX: layer.x,
      initY: layer.y
    });
  };

  const handleMouseDown = (e: React.MouseEvent, layer: PlacedLayer) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY, layer);
  };

  const handleTouchStart = (e: React.TouchEvent, layer: PlacedLayer) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY, layer);
  };

  const handleWheel = (e: React.WheelEvent, layerId: string) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setPlacedLogos((prev) =>
      prev.map((l) => {
        if (l.uid !== layerId) return l;
        const newScale = Math.max(0.2, Math.min(3.0, l.scale + delta));
        return { ...l, scale: newScale };
      })
    );
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!draggedItem || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaXPercent = ((clientX - draggedItem.startX) / rect.width) * 100;
      const deltaYPercent = ((clientY - draggedItem.startY) / rect.height) * 100;

      setPlacedLogos((prev) =>
        prev.map((l) => {
          if (l.uid !== draggedItem.uid) return l;
          return {
            ...l,
            x: Math.max(0, Math.min(100, draggedItem.initX + deltaXPercent)),
            y: Math.max(0, Math.min(100, draggedItem.initY + deltaYPercent))
          };
        })
      );
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => setDraggedItem(null);
    const onTouchMove = (e: TouchEvent) => {
      if (draggedItem) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => setDraggedItem(null);

    if (draggedItem) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [draggedItem]);

  // AI Mockup Generation Handler
  const handleGenerate = async () => {
    const product = assets.find((a) => a.id === selectedProductId);
    if (!product) {
      alert('Please select a product blank.');
      return;
    }

    const layers = placedLogos
      .map((layer) => {
        const asset = assets.find((a) => a.id === layer.assetId);
        return asset ? { asset, placement: layer } : null;
      })
      .filter(Boolean) as { asset: Asset; placement: PlacedLayer }[];

    if (layers.length === 0) {
      alert('Please place at least one artwork graphic on the canvas.');
      return;
    }

    if (!(await validateApiKey())) return;

    setLoading({ isGenerating: true, message: 'Rendering fabric distortion & lighting with Gemini...' });
    try {
      const resultImage = await generateMockup(product, layers, prompt);
      const newMockup: GeneratedMockup = {
        id: Math.random().toString(36).substring(7),
        imageUrl: resultImage,
        prompt,
        createdAt: Date.now(),
        layers: placedLogos,
        productId: selectedProductId,
        productName: product.name,
        completefulDesignId: `capp_des_${Math.random().toString(36).substring(7)}`
      };

      setGeneratedMockups((prev) => [newMockup, ...prev]);
      setView('gallery');
    } catch (e: any) {
      console.error(e);
      handleApiError(e);
    } finally {
      setLoading({ isGenerating: false, message: '' });
    }
  };

  // Push mockup directly to Completeful Product Link
  const handlePublishToCompleteful = (mockup: GeneratedMockup) => {
    const newProductLinkId = `plink_${Date.now()}`;
    const newProductLink: CompletefulProductLink = {
      id: newProductLinkId,
      localProductId: `fft_prod_${mockup.id}`,
      productTitle: mockup.productName || 'FuelnFreeTime Custom Garment',
      completefulStoreProductId: `capp_sp_${Math.floor(100000 + Math.random() * 900000)}`,
      completefulCatalogId: 'cat_item_custom_blank',
      completefulDesignId: mockup.completefulDesignId || `capp_des_${mockup.id}`,
      thumbnailUrl: mockup.imageUrl,
      designOptionMetadata: {
        printTechnique: 'dtg',
        printLocations: ['front'],
        colorway: 'Standard',
        dpi: 300,
        aspectRatio: '1:1'
      },
      status: 'published',
      syncedAt: Date.now()
    };

    setProductLinks((prev) => [newProductLink, ...prev]);
    setGeneratedMockups((prev) =>
      prev.map((m) => (m.id === mockup.id ? { ...m, syncedToCompleteful: true } : m))
    );

    // Record in operations ledger
    const op: CompletefulOperation = {
      id: `op_${Date.now()}`,
      operationType: 'product_publish',
      resourceId: newProductLinkId,
      idempotencyKey: `idemp_pub_${mockup.id}_v1`,
      status: 'success',
      requestPayload: {
        shopId: completefulConfig.selectedShopId,
        designId: newProductLink.completefulDesignId,
        title: newProductLink.productTitle
      },
      responsePayload: {
        completefulStoreProductId: newProductLink.completefulStoreProductId,
        status: 'published'
      },
      isDryRun: !completefulConfig.allowLiveWrites,
      timestamp: Date.now()
    };
    setOperations((prev) => [op, ...prev]);
    alert(`Successfully synced design "${newProductLink.productTitle}" to Completeful Store Products!`);
  };

  if (showIntro) {
    return <IntroSequence onComplete={() => setShowIntro(false)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex overflow-hidden relative">
      {/* API Key Modal */}
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleApiKeyDialogContinue} />}

      {/* Gemini AI Multi-Turn Chatbot Drawer */}
      <AiChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onApplyPromptToStudio={(newPrompt) => {
          setPrompt(newPrompt);
          setView('studio');
          setIsChatOpen(false);
        }}
      />

      {/* Sidebar Navigation (Desktop) */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/80 hidden md:flex flex-col flex-shrink-0 z-30">
        <div className="h-16 border-b border-zinc-800 flex items-center px-4">
          <BrandLogo size="sm" showSubtitle={false} />
        </div>

        <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-3 py-1">
            Studio Workflows
          </div>
          <NavButton
            icon={<Layout size={16} />}
            label="Overview"
            active={view === 'dashboard'}
            onClick={() => setView('dashboard')}
          />
          <NavButton
            icon={<Box size={16} />}
            label="Blanks & Artwork"
            active={view === 'assets'}
            badge={assets.length}
            onClick={() => setView('assets')}
          />
          <NavButton
            icon={<Wand2 size={16} />}
            label="Mockup Studio"
            active={view === 'studio'}
            onClick={() => setView('studio')}
          />
          <NavButton
            icon={<ImageIcon size={16} />}
            label="Render Gallery"
            active={view === 'gallery'}
            badge={generatedMockups.length}
            onClick={() => setView('gallery')}
          />

          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 px-3 pt-4 pb-1">
            Fulfillment & Commerce
          </div>
          <NavButton
            icon={<Truck size={16} className="text-indigo-400" />}
            label="Completeful Hub"
            active={view === 'completeful'}
            badge={orderLinks.length}
            badgeColor="bg-indigo-900/50 text-indigo-300"
            onClick={() => setView('completeful')}
          />
        </div>

        {/* AI Assistant Quick Launcher in Sidebar */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2">
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 hover:from-amber-500/20 hover:to-red-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between transition-all"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              AI Design Copilot
            </span>
            <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">Gemini</span>
          </button>

          <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
            <span>Mode:</span>
            <span className="text-amber-400 font-bold">
              {completefulConfig.allowLiveWrites ? 'Live Active' : 'Dry-Run Test'}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 z-40">
        <BrandLogo size="sm" showSubtitle={false} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChatOpen(true)}
            className="p-2 text-amber-400 hover:bg-zinc-800 rounded-lg"
            title="Open AI Copilot"
          >
            <Sparkles size={18} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-400 hover:text-white">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-zinc-950/98 backdrop-blur-xl p-4 flex flex-col space-y-2">
          <NavButton
            icon={<Layout size={18} />}
            label="Overview"
            active={view === 'dashboard'}
            onClick={() => {
              setView('dashboard');
              setIsMobileMenuOpen(false);
            }}
          />
          <NavButton
            icon={<Box size={18} />}
            label="Blanks & Artwork"
            active={view === 'assets'}
            badge={assets.length}
            onClick={() => {
              setView('assets');
              setIsMobileMenuOpen(false);
            }}
          />
          <NavButton
            icon={<Wand2 size={18} />}
            label="Mockup Studio"
            active={view === 'studio'}
            onClick={() => {
              setView('studio');
              setIsMobileMenuOpen(false);
            }}
          />
          <NavButton
            icon={<ImageIcon size={18} />}
            label="Render Gallery"
            active={view === 'gallery'}
            badge={generatedMockups.length}
            onClick={() => {
              setView('gallery');
              setIsMobileMenuOpen(false);
            }}
          />
          <NavButton
            icon={<Truck size={18} className="text-indigo-400" />}
            label="Completeful Hub"
            active={view === 'completeful'}
            badge={orderLinks.length}
            onClick={() => {
              setView('completeful');
              setIsMobileMenuOpen(false);
            }}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedMockup && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedMockup(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMockup(null)}
              className="absolute top-4 right-4 md:top-0 md:-right-12 p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors z-50 border border-zinc-700"
            >
              <X size={20} />
            </button>

            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950/80 p-2">
              <img
                src={selectedMockup.imageUrl}
                alt="Full size preview"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            </div>

            <div className="mt-4 bg-zinc-900/90 backdrop-blur border border-zinc-700 px-6 py-3 rounded-full flex items-center gap-4 flex-wrap justify-center">
              <p className="text-xs text-zinc-300 max-w-md truncate font-mono">
                {selectedMockup.productName || 'Custom Apparel'} • {selectedMockup.completefulDesignId || 'Design Layer'}
              </p>
              <div className="h-4 w-px bg-zinc-700 hidden sm:block"></div>
              <a
                href={selectedMockup.imageUrl}
                download={`fft-mockup-${selectedMockup.id}.png`}
                className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={14} /> Download High-Res
              </a>
              <button
                onClick={() => handlePublishToCompleteful(selectedMockup)}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Truck size={14} /> Push to Completeful
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-20 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 md:px-10">
          <div className="text-xs text-zinc-400 breadcrumbs flex items-center gap-2">
            <span className="text-zinc-500 font-bold uppercase">FuelnFreeTime</span>
            <span className="text-zinc-700">/</span>
            <span className="text-white capitalize font-semibold">{view}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-red-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>AI Copilot</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-300">Completeful POD Connected</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 md:p-10">
          {/* VIEW 1: DASHBOARD */}
          {view === 'dashboard' && (
            <div className="animate-fade-in space-y-10">
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold mb-6">
                  <Flame size={14} /> Official FuelnFreeTime Merch Engine
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase max-w-3xl mx-auto leading-tight">
                  Design Realistic Apparel & Automate{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
                    Completeful POD
                  </span>
                </h1>
                <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto mt-4 mb-8 leading-relaxed">
                  Composite custom logos with real fabric texture distortion, calibrate print locations, and synchronize directly with Completeful fulfillment quotes and live order tracking.
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Button
                    size="lg"
                    onClick={() => setView('studio')}
                    className="bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-zinc-950 font-bold px-8 shadow-xl shadow-orange-500/20"
                    icon={<ArrowRight size={18} />}
                  >
                    Open Mockup Studio
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setView('completeful')}
                    icon={<Truck size={18} className="text-indigo-400" />}
                  >
                    Completeful Hub
                  </Button>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: <Box className="text-amber-400" size={22} />,
                    title: 'Apparel & Graphic Assets',
                    desc: 'Fleece hoodies, vintage tees, raglans, and vector graphics ready for multi-layer placement.'
                  },
                  {
                    icon: <Wand2 className="text-orange-400" size={22} />,
                    title: 'Gemini Fabric Compositing',
                    desc: 'Realistic DTG ink penetration, embroidery simulation, folds, wrinkles, and natural studio lighting.'
                  },
                  {
                    icon: <Truck className="text-indigo-400" size={22} />,
                    title: 'Completeful D1 Integration',
                    desc: 'Live quotes, order lifecycle (Stripe Paid → Completeful POD), HMAC-SHA256 webhook dispatcher.'
                  }
                ].map((feat, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-colors space-y-3"
                  >
                    <div className="p-3 bg-zinc-950 w-fit rounded-xl border border-zinc-800">{feat.icon}</div>
                    <h3 className="text-base font-bold text-white">{feat.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 2: ASSETS */}
          {view === 'assets' && (
            <div className="animate-fade-in space-y-6">
              <WorkflowStepper currentView="assets" onViewChange={setView} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AssetSection
                  title="Apparel Garment Blanks"
                  icon={<Box size={18} />}
                  type="product"
                  assets={assets.filter((a) => a.type === 'product')}
                  onAdd={(a) => setAssets((prev) => [...prev, a])}
                  onRemove={(id) => setAssets((prev) => prev.filter((a) => a.id !== id))}
                  validateApiKey={validateApiKey}
                  onApiError={handleApiError}
                />
                <AssetSection
                  title="Brand Artwork & Badges"
                  icon={<Layers size={18} />}
                  type="logo"
                  assets={assets.filter((a) => a.type === 'logo')}
                  onAdd={(a) => setAssets((prev) => [...prev, a])}
                  onRemove={(id) => setAssets((prev) => prev.filter((a) => a.id !== id))}
                  validateApiKey={validateApiKey}
                  onApiError={handleApiError}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setView('studio')}
                  disabled={assets.length < 2}
                  className="bg-gradient-to-r from-amber-500 to-red-600 text-zinc-950 font-bold"
                  icon={<ArrowRight size={16} />}
                >
                  Continue to Mockup Studio
                </Button>
              </div>
            </div>
          )}

          {/* VIEW 3: STUDIO */}
          {view === 'studio' && (
            <div className="animate-fade-in flex flex-col-reverse lg:flex-row gap-6">
              {/* Studio Left Toolbar */}
              <div className="w-full lg:w-96 flex flex-col gap-5 glass-panel p-6 rounded-2xl border border-zinc-800 flex-shrink-0">
                {/* 1. Select Garment Blank */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>1. Select Apparel Blank</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {assets.filter((a) => a.type === 'product').length} available
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {assets
                      .filter((a) => a.type === 'product')
                      .map((a) => (
                        <div
                          key={a.id}
                          onClick={() => setSelectedProductId(a.id)}
                          className={`aspect-square rounded-xl border-2 cursor-pointer p-1 transition-all bg-zinc-950 flex flex-col items-center justify-center ${
                            selectedProductId === a.id
                              ? 'border-amber-500 bg-amber-500/10 shadow-md'
                              : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <img src={a.data} className="w-full h-full object-contain" alt={a.name} referrerPolicy="no-referrer" />
                        </div>
                      ))}
                  </div>
                </div>

                {/* 2. Add Graphics & Placement */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      2. Add Artwork & Placement
                    </h3>
                    {placedLogos.length > 0 && (
                      <span className="text-[11px] text-amber-400 font-mono font-bold">
                        {placedLogos.length} placed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    Click graphic to add. Drag on preview to move, mouse scroll to resize.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {assets
                      .filter((a) => a.type === 'logo')
                      .map((a) => (
                        <div
                          key={a.id}
                          onClick={() => addLogoToCanvas(a.id)}
                          className="relative aspect-square rounded-xl border-2 border-zinc-800 hover:border-zinc-600 bg-zinc-950 cursor-pointer p-1.5 transition-all flex items-center justify-center"
                        >
                          <img src={a.data} className="w-full h-full object-contain" alt={a.name} referrerPolicy="no-referrer" />
                          {placedLogos.filter((l) => l.assetId === a.id).length > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-zinc-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                              {placedLogos.filter((l) => l.assetId === a.id).length}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Print Location Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Print Technique & Location
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'front', label: 'Front Chest (DTG)' },
                      { id: 'back', label: 'Full Back (DTG)' },
                      { id: 'sleeve-left', label: 'Left Sleeve Stamp' },
                      { id: 'embroidery-chest', label: 'Chest Embroidery' }
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setSelectedPrintLocation(loc.id as any)}
                        className={`p-2 rounded-lg text-left text-[11px] transition-colors ${
                          selectedPrintLocation === loc.id
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:bg-zinc-900'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. AI Directives */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    3. AI Rendering Directives
                  </h3>
                  <textarea
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-amber-500 resize-none h-20 placeholder:text-zinc-600"
                    placeholder="E.g. DTG screenprint texture, realistic wrinkles, studio warm lighting..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  isLoading={loading.isGenerating}
                  disabled={!selectedProductId || placedLogos.length === 0}
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-zinc-950 font-bold shadow-lg shadow-orange-500/20"
                  icon={<Wand2 size={16} />}
                >
                  Generate Photorealistic Mockup
                </Button>
              </div>

              {/* Right Canvas Stage */}
              <div className="flex-1 glass-panel rounded-2xl flex items-center justify-center bg-zinc-950 relative overflow-hidden select-none min-h-[480px] border border-zinc-800">
                {loading.isGenerating && (
                  <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-amber-400 font-mono text-xs animate-pulse font-bold">{loading.message}</p>
                  </div>
                )}

                {selectedProductId ? (
                  <div ref={canvasRef} className="relative w-full h-full max-h-[580px] p-6 flex items-center justify-center">
                    {/* Apparel Base Blank */}
                    <img
                      src={assets.find((a) => a.id === selectedProductId)?.data}
                      className="max-h-[500px] w-auto object-contain drop-shadow-2xl pointer-events-none select-none rounded-xl"
                      alt="Apparel Base"
                      draggable={false}
                      referrerPolicy="no-referrer"
                    />

                    {/* Placed Layer Overlays */}
                    {placedLogos.map((layer) => {
                      const logoAsset = assets.find((a) => a.id === layer.assetId);
                      if (!logoAsset) return null;
                      const isDraggingThis = draggedItem?.uid === layer.uid;

                      return (
                        <div
                          key={layer.uid}
                          className={`absolute cursor-move group ${isDraggingThis ? 'z-50 opacity-80' : 'z-10'}`}
                          style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            transform: `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotation}deg)`,
                            width: '18%',
                            aspectRatio: '1/1'
                          }}
                          onMouseDown={(e) => handleMouseDown(e, layer)}
                          onTouchStart={(e) => handleTouchStart(e, layer)}
                          onWheel={(e) => handleWheel(e, layer.uid)}
                        >
                          <div className="absolute -inset-1 border-2 border-amber-500/0 group-hover:border-amber-500/60 rounded-xl transition-all pointer-events-none"></div>
                          <button
                            onClick={(e) => removeLogoFromCanvas(layer.uid, e)}
                            onTouchEnd={(e) => removeLogoFromCanvas(layer.uid, e)}
                            className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg z-50"
                            title="Remove layer"
                          >
                            <X size={12} />
                          </button>
                          <img
                            src={logoAsset.data}
                            className="w-full h-full object-contain drop-shadow-lg pointer-events-none"
                            draggable={false}
                            alt="Placed artwork"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-zinc-600 space-y-2">
                    <Shirt size={48} className="mx-auto opacity-30" />
                    <p className="text-xs">Select an apparel blank on the left to start placement.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: GALLERY */}
          {view === 'gallery' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Generated Apparel Visuals</h2>
                  <p className="text-xs text-zinc-400">High-resolution AI mockups with Completeful publishing integration</p>
                </div>
                <Button
                  onClick={() => setView('studio')}
                  className="bg-gradient-to-r from-amber-500 to-red-600 text-zinc-950 font-bold"
                  icon={<Plus size={16} />}
                >
                  Create New Mockup
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedMockups.map((mockup) => (
                  <div key={mockup.id} className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 space-y-3 p-3">
                    <div className="aspect-square bg-zinc-950 rounded-xl relative overflow-hidden group">
                      <img src={mockup.imageUrl} className="w-full h-full object-cover" alt="Mockup" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Maximize size={14} />}
                          onClick={() => setSelectedMockup(mockup)}
                        >
                          Enlarge
                        </Button>
                        <a href={mockup.imageUrl} download={`fft-mockup-${mockup.id}.png`}>
                          <Button size="sm" variant="primary" icon={<Download size={14} />}>
                            Save
                          </Button>
                        </a>
                      </div>
                    </div>

                    <div className="p-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate">{mockup.productName || 'FuelnFreeTime Merch'}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {new Date(mockup.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2">{mockup.prompt}</p>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ID: {mockup.completefulDesignId || 'local'}
                        </span>
                        <button
                          onClick={() => handlePublishToCompleteful(mockup)}
                          disabled={mockup.syncedToCompleteful}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            mockup.syncedToCompleteful
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          <Truck size={12} />
                          {mockup.syncedToCompleteful ? 'Synced to POD' : 'Push to Completeful'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {generatedMockups.length === 0 && (
                  <div className="col-span-full py-20 text-center glass-panel rounded-2xl border border-zinc-800 space-y-4">
                    <ImageIcon size={48} className="mx-auto text-zinc-700" />
                    <h3 className="text-base font-bold text-white">No Mockups Rendered Yet</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Assemble your blanks and graphics in the Mockup Studio to generate photorealistic production visuals.
                    </p>
                    <Button onClick={() => setView('studio')} icon={<Wand2 size={16} />}>
                      Go to Studio
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 5: COMPLETEFUL PROVIDER HUB */}
          {view === 'completeful' && (
            <CompletefulHub
              shops={completefulShops}
              productLinks={productLinks}
              variantLinks={variantLinks}
              orderLinks={orderLinks}
              operations={operations}
              webhookSubscriptions={webhookSubscriptions}
              webhookEvents={webhookEvents}
              config={completefulConfig}
              onUpdateConfig={setCompletefulConfig}
              onUpdateOrders={setOrderLinks}
              onAddWebhookEvent={(evt) => setWebhookEvents((prev) => [evt, ...prev])}
              onAddOperation={(op) => setOperations((prev) => [op, ...prev])}
            />
          )}
        </div>
      </main>
    </div>
  );
}
