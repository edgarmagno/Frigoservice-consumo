/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, FormEvent, useCallback, memo } from 'react';
import { 
  Plus, 
  Minus, 
  Send, 
  X, 
  Trash2,
  LogOut,
  Loader2,
  PackagePlus,
  Hotel as HotelBuilding,
  User,
  ChevronRight,
  Edit,
  ArrowLeft,
  GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  query, 
  where,
  addDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Types ---

interface FrigobarItem {
  id: string;
  name: string;
  price: number;
  order?: number;
}

interface Hotel {
  id: string;
  name: string;
  color: string;
  loginEmail: string;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (err: any, operationType: FirestoreErrorInfo['operationType'], path: string | null) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: err.message || String(err),
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'anonymous',
      email: user?.email || '',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      })) || []
    }
  };
  
  if (err.code === 'permission-denied') {
    throw JSON.stringify(errorInfo);
  }
  console.error('Firestore Error:', errorInfo);
};

// --- Helpers ---

const normalizeToEmail = (id: string) => {
  const cleanId = id.trim().toLowerCase();
  if (cleanId.includes('@')) return cleanId;
  return `${cleanId}@frigoservice.com`;
};

// --- Components ---

function FrigoLogo({ className = "h-12" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center select-none`}>
      <img 
        src="https://frigoservice.com.br/wp-content/uploads/2023/08/frigoservice-logo-cor.png" 
        alt="Frigo Service" 
        className="h-full w-auto object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function Login({ onLogin }: { onLogin: (id: string, pass: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#f1f5f9_0%,_transparent_75%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-white rounded-[3rem] p-8 sm:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.06)] relative z-10 border border-slate-100/50"
      >
        <div className="flex flex-col items-center mb-10 md:mb-12">
          <div className="mb-4 select-none flex justify-center">
            <FrigoLogo className="h-32 md:h-40" />
          </div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] text-center">
            Consumo Inteligente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">ID do Usuário</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
              <input
                type="text"
                id="usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                autoComplete="username"
                className="w-full pl-14 pr-6 sm:pr-24 md:pr-32 py-4 md:py-5 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-3xl outline-none transition-all font-semibold text-slate-900 text-base"
                placeholder="ex: hotel01"
              />
              {!username.includes('@') && username.length > 0 && (
                <span className="hidden sm:block absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] md:text-xs pointer-events-none">
                  @frigoservice.com
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Senha</label>
            <div className="relative group">
              <input
                type="password"
                id="senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-6 py-4 md:py-5 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-3xl outline-none transition-all font-semibold text-slate-900 text-base"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-3xl font-display font-black text-base md:text-lg shadow-xl shadow-slate-200 hover:shadow-2xl hover:bg-black active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'ACESSAR CONSOLE'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AdminDashboard() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [items, setItems] = useState<FrigobarItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingItem, setEditingItem] = useState<FrigobarItem | null>(null);

  // Form states
  const [hotelForm, setHotelForm] = useState({ name: '', loginEmail: '', color: '#004a99', cloneSourceId: '' });
  const [itemForm, setItemForm] = useState({ name: '', price: '' });
  const [hotelError, setHotelError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'hotels'), 
      (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hotel));
        setHotels(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, 'list', 'hotels')
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedHotelId) return;
    const unsub = onSnapshot(
      collection(db, 'hotels', selectedHotelId, 'items'), 
      (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FrigobarItem));
        setItems(data.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        }));
      },
      (err) => handleFirestoreError(err, 'list', `hotels/${selectedHotelId}/items`)
    );
    return () => {
      unsub();
      setItems([]);
    };
  }, [selectedHotelId]);

  const openAddHotel = () => {
    setEditingHotel(null);
    setHotelForm({ name: '', loginEmail: '', color: '#004a99', cloneSourceId: '' });
    setHotelError(null);
    setIsHotelModalOpen(true);
  };

  const openEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setHotelForm({ name: hotel.name, loginEmail: hotel.loginEmail, color: hotel.color, cloneSourceId: '' });
    setHotelError(null);
    setIsHotelModalOpen(true);
  };

  const handleHotelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setHotelError(null);
    try {
      const { cloneSourceId, ...hotelData } = hotelForm;
      const targetEmail = hotelData.loginEmail.toLowerCase().trim();

      if (!targetEmail) {
        setHotelError("ID de Acesso é obrigatório.");
        return;
      }

      // Check if duplicate login exists
      const isDuplicate = hotels.some(h => 
        (!editingHotel || h.id !== editingHotel.id) && 
        h.loginEmail.toLowerCase().trim() === targetEmail
      );

      if (isDuplicate) {
        setHotelError("Já existe uma unidade cadastrada com este ID de Acesso.");
        return;
      }

      let targetHotelId = '';

      if (editingHotel) {
        targetHotelId = editingHotel.id;
        await updateDoc(doc(db, 'hotels', targetHotelId), {
          ...hotelData,
          loginEmail: targetEmail
        });
      } else {
        const docRef = await addDoc(collection(db, 'hotels'), {
          ...hotelData,
          loginEmail: targetEmail
        });
        targetHotelId = docRef.id;
      }

      // If a clone source is selected, copy all of its items
      if (cloneSourceId) {
        const sourceItemsSnap = await getDocs(collection(db, 'hotels', cloneSourceId, 'items'));
        const promises = sourceItemsSnap.docs.map(itemDoc => {
          const itemData = itemDoc.data();
          return addDoc(collection(db, 'hotels', targetHotelId, 'items'), {
            name: itemData.name || '',
            price: itemData.price || 0,
            order: itemData.order !== undefined ? itemData.order : 0
          });
        });
        await Promise.all(promises);
      }

      setIsHotelModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingHotel ? 'update' : 'create', 'hotels');
    }
  };

  const deleteHotel = async (id: string) => {
    if (!confirm('Excluir este hotel e todos os seus itens?')) return;
    try {
      await deleteDoc(doc(db, 'hotels', id));
      if (selectedHotelId === id) setSelectedHotelId(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `hotels/${id}`);
    }
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', price: '' });
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: FrigobarItem) => {
    setEditingItem(item);
    setItemForm({ name: item.name, price: item.price.toString() });
    setIsItemModalOpen(true);
  };

  const handleItemSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHotelId) return;
    const price = parseFloat(itemForm.price);
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'hotels', selectedHotelId, 'items', editingItem.id), {
          name: itemForm.name,
          price: isNaN(price) ? 0 : price
        });
      } else {
        await addDoc(collection(db, 'hotels', selectedHotelId, 'items'), {
          name: itemForm.name,
          price: isNaN(price) ? 0 : price,
          order: items.length
        });
      }
      setIsItemModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingItem ? 'update' : 'create', `hotels/${selectedHotelId}/items`);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedHotelId || !confirm('Deseja excluir este item?')) return;
    try {
      await deleteDoc(doc(db, 'hotels', selectedHotelId, 'items', itemId));
    } catch (err) {
      handleFirestoreError(err, 'delete', `hotels/${selectedHotelId}/items/${itemId}`);
    }
  };

  const saveItemsOrder = async (orderedList: FrigobarItem[]) => {
    if (!selectedHotelId) return;
    try {
      const batch = writeBatch(db);
      orderedList.forEach((item, idx) => {
        const itemRef = doc(db, 'hotels', selectedHotelId, 'items', item.id);
        batch.update(itemRef, { order: idx });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'update', `hotels/${selectedHotelId}/items`);
    }
  };

  const cloneItemsFrom = async (sourceHotelId: string) => {
    if (!selectedHotelId || !confirm('Copiar todos os itens e preços deste hotel? Itens com o mesmo nome serão duplicados.')) return;
    try {
      const sourceItemsSnap = await getDocs(collection(db, 'hotels', sourceHotelId, 'items'));
      const promises = sourceItemsSnap.docs.map(d => {
        const itemData = d.data();
        return addDoc(collection(db, 'hotels', selectedHotelId, 'items'), {
          name: itemData.name || '',
          price: itemData.price || 0,
          order: itemData.order !== undefined ? itemData.order : 0
        });
      });
      await Promise.all(promises);
      setIsCloneModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, 'create', `hotels/${selectedHotelId}/items`);
    }
  };

  const selectedHotel = hotels.find(h => h.id === selectedHotelId);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin text-slate-900" size={48} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <HotelBuilding size={20} />
          </div>
          <div>
            <h1 className="text-xl font-display font-black tracking-tight">Console Gerencial</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{auth.currentUser?.email?.split('@')[0]}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)} 
          className="px-5 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-full transition-all flex items-center gap-2 text-xs font-bold"
        >
          <LogOut size={14} /> Sair
        </button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden relative">
        {/* Sidebar: Hotels List */}
        <div className={`w-full md:w-96 bg-white border-r border-slate-100 flex flex-col h-full bg-slate-50 md:bg-white ${selectedHotelId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 flex justify-between items-center border-b border-slate-50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidades</h2>
            <button 
              onClick={openAddHotel}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {hotels.map(hotel => (
              <div
                key={hotel.id}
                onClick={() => setSelectedHotelId(hotel.id)}
                className={`w-full group p-4 rounded-2xl text-left transition-all flex items-center gap-4 cursor-pointer relative overflow-hidden ${
                  selectedHotelId === hotel.id 
                    ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200 translate-x-1' 
                    : 'hover:bg-slate-100/80 active:scale-[0.98]'
                }`}
              >
                <div 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    selectedHotelId === hotel.id ? 'bg-white/10' : 'bg-slate-100'
                  }`}
                >
                  <HotelBuilding size={18} className={selectedHotelId === hotel.id ? 'text-white' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate uppercase tracking-tight">{hotel.name}</p>
                  <p className={`text-[10px] font-medium truncate opacity-60 ${selectedHotelId === hotel.id ? 'text-white' : 'text-slate-400'}`}>
                    ID: {hotel.loginEmail.split('@')[0]}
                  </p>
                </div>
                <div className="flex items-center gap-1 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditHotel(hotel); }}
                    className={`p-2 rounded-lg transition-colors ${selectedHotelId === hotel.id ? 'hover:bg-white/20' : 'hover:bg-slate-200'}`}
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area: Items Management */}
        <div className={`flex-1 overflow-y-auto bg-slate-50 flex flex-col ${!selectedHotelId ? 'hidden md:flex' : 'flex'}`}>
          <AnimatePresence mode="wait">
            {!selectedHotelId ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-32 h-32 bg-white rounded-4xl flex items-center justify-center text-slate-200 shadow-sm mb-6">
                  <HotelBuilding size={64} strokeWidth={1} />
                </div>
                <h3 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight mb-2">Selecione uma Unidade</h3>
                <p className="text-slate-400 font-medium max-w-xs">Escolha um hotel ao lado para gerenciar itens, preços e configurações.</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedHotelId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="p-6 md:p-12 w-full max-w-7xl mx-auto"
              >
                {/* Modern Header */}
                <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-slate-100/50 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setSelectedHotelId(null)}
                      className="md:hidden w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight mb-2 uppercase">{selectedHotel?.name}</h2>
                      <div className="flex flex-wrap gap-4 items-center">
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                          <User size={12} /> ID: {selectedHotel?.loginEmail.split('@')[0]}
                        </span>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-100" style={{ backgroundColor: selectedHotel?.color }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {hotels.length > 1 && (
                      <button 
                        onClick={() => setIsCloneModalOpen(true)}
                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-slate-200"
                      >
                        Clonar Itens
                      </button>
                    )}
                    <button 
                      onClick={openAddItem}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                    >
                      <Plus size={18} /> Novo Item
                    </button>
                  </div>
                </div>

                {/* Modern Card List with Drag & Drop */}
                {items.length === 0 ? (
                  <div className="bg-white/50 rounded-4xl border-2 border-dashed border-slate-200 p-20 text-center">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum item cadastrado</p>
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={items} 
                    onReorder={setItems}
                    className="grid grid-cols-1 gap-4"
                  >
                    {items.map((item) => (
                      <Reorder.Item 
                        key={item.id} 
                        value={item}
                        onDragEnd={() => saveItemsOrder(items)}
                        className="bg-white group p-6 rounded-[2rem] border border-transparent hover:border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.03)] transition-all flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Drag & Drop Handle visual indicator */}
                          <div className="text-slate-300 group-hover:text-slate-500 p-1 flex items-center justify-center transition-colors shrink-0">
                            <GripVertical size={20} />
                          </div>

                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-slate-900 transition-colors shrink-0">
                            <PackagePlus size={20} />
                          </div>
                          <div className="truncate">
                            <p className="font-display font-black text-slate-900 text-lg uppercase tracking-tight leading-none mb-1 truncate">{item.name}</p>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Preço Unitário: R$ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditItem(item);
                            }}
                            className="p-4 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                          >
                            <Edit size={20} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(item.id);
                            }}
                            className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODALS - Updated with modern radius and feel */}
      <AnimatePresence>
        {isHotelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-md rounded-4xl p-10 shadow-2xl space-y-8"
            >
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight uppercase">
                  {editingHotel ? 'Configurações' : 'Nova Unidade'}
                </h2>
                <p className="text-slate-400 text-sm font-medium">Preencha os dados do hotel para acesso.</p>
              </div>
              <form onSubmit={handleHotelSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Nome do Hotel</label>
                  <input 
                    autoFocus required value={hotelForm.name}
                    onChange={e => setHotelForm({...hotelForm, name: e.target.value})}
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold uppercase text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">ID de Acesso</label>
                  <input 
                    type="text" required value={hotelForm.loginEmail.split('@')[0]}
                    onChange={e => setHotelForm({...hotelForm, loginEmail: normalizeToEmail(e.target.value)})}
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold placeholder:opacity-30 text-base"
                    placeholder="ex: hotel01"
                  />
                  <p className="text-[11px] text-slate-400 font-semibold ml-2">A senha padrão para esta unidade será <strong className="text-slate-900 font-bold">123456</strong></p>
                  {hotelError && (
                    <p className="text-xs text-red-500 font-semibold ml-2 bg-red-50 p-3 rounded-2xl border border-red-100">
                      {hotelError}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Cor da Interface</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" required value={hotelForm.color}
                      onChange={e => setHotelForm({...hotelForm, color: e.target.value})}
                      className="flex-1 p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold text-base"
                    />
                    <input 
                      type="color" value={hotelForm.color}
                      onChange={e => setHotelForm({...hotelForm, color: e.target.value})}
                      className="w-16 h-16 rounded-3xl border-0 overflow-hidden cursor-pointer"
                    />
                  </div>
                </div>

                {hotels.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">
                      {editingHotel ? "Clonar Itens para esta Unidade (Opcional)" : "Clonar Itens de Outro Hotel (Opcional)"}
                    </label>
                    <div className="relative">
                      <select
                        value={hotelForm.cloneSourceId}
                        onChange={e => setHotelForm({...hotelForm, cloneSourceId: e.target.value})}
                        className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold text-base text-slate-800 appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Não clonar (Iniciar vazio/Manter atuais)</option>
                        {hotels
                          .filter(h => !editingHotel || h.id !== editingHotel.id)
                          .map(h => (
                            <option key={h.id} value={h.id}>
                              {h.name} ({h.loginEmail.split('@')[0]})
                            </option>
                          ))
                        }
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight size={18} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsHotelModalOpen(false)} className="flex-1 py-5 rounded-3xl font-bold bg-slate-50 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                    <button type="submit" className="flex-1 py-5 rounded-3xl font-black bg-slate-900 text-white shadow-xl shadow-slate-200 uppercase tracking-widest text-xs">Salvar</button>
                  </div>
                  {editingHotel && (
                    <button 
                      type="button"
                      onClick={() => { if(confirm('Excluir este hotel permanentemente?')) { deleteHotel(editingHotel.id); setIsHotelModalOpen(false); } }}
                      className="w-full py-4 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Excluir Unidade
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isItemModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-md rounded-4xl p-10 shadow-2xl space-y-8"
            >
              <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight uppercase">
                {editingItem ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <form onSubmit={handleItemSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Nome do Produto</label>
                  <input 
                    autoFocus required value={itemForm.name}
                    onChange={e => setItemForm({...itemForm, name: e.target.value})}
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold uppercase text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Preço Unitário (R$)</label>
                  <input 
                    type="number" step="0.01" required value={itemForm.price}
                    onChange={e => setItemForm({...itemForm, price: e.target.value})}
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold text-base"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-5 rounded-3xl font-bold bg-slate-50 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                  <button type="submit" className="flex-1 py-5 rounded-3xl font-black bg-slate-900 text-white shadow-xl shadow-slate-200 uppercase tracking-widest text-xs">Confirmar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isCloneModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white w-full max-w-md rounded-4xl p-10 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight mb-2 uppercase">Clonar Inventário</h2>
                <p className="text-slate-400 text-sm font-medium italic">Selecione uma unidade de origem para copiar itens e preços.</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {hotels.filter(h => h.id !== selectedHotelId).map(hotel => (
                  <button
                    key={hotel.id}
                    onClick={() => cloneItemsFrom(hotel.id)}
                    className="w-full group p-5 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-3xl transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <span className="font-display font-black uppercase text-xs tracking-widest block mb-1">{hotel.name}</span>
                      <span className="text-[10px] font-bold opacity-40 uppercase">ID: {hotel.loginEmail.split('@')[0]}</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
              <button onClick={() => setIsCloneModalOpen(false)} className="w-full mt-6 py-5 bg-white border-2 border-slate-100 font-bold rounded-3xl uppercase tracking-widest text-xs">Fechar</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LauncherItemProps {
  item: FrigobarItem;
  quantity: number;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  hotelColor: string;
}

const LauncherItem = memo(({ item, quantity, onUpdateQuantity, hotelColor }: LauncherItemProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1 }}
      className={`bg-white p-4 sm:p-6 rounded-[7.5px] shadow-[0_4px_15px_rgba(0,0,0,0.02)] border transition-all duration-150 ${
        quantity > 0 ? 'border-slate-300 ring-2 ring-slate-100/50' : 'border-slate-100 hover:border-slate-200'
      } flex items-center justify-between group`}
    >
      <div className="flex-1 pr-4">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1 leading-tight uppercase tracking-tight group-hover:text-black transition-colors">{item.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs sm:text-sm font-bold">R$ {item.price.toFixed(2)}</span>
          {quantity > 0 && <span className="w-1 h-1 bg-slate-300 rounded-full" />}
          {quantity > 0 && (
            <span className="text-[10px] font-black text-slate-900 uppercase">Total: R$ {(quantity * item.price).toFixed(2)}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <button 
          onClick={() => onUpdateQuantity(item.id, -1)}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
            quantity > 0 ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-200 pointer-events-none'
          }`}
        >
          <Minus size={20} strokeWidth={3} />
        </button>
        
        <span className="w-5 text-center font-bold text-base sm:text-lg tabular-nums">
          {quantity}
        </span>
        
        <button 
          onClick={() => onUpdateQuantity(item.id, 1)}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-95 active:brightness-90 transition-all"
          style={{ backgroundColor: hotelColor }}
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
});

LauncherItem.displayName = 'LauncherItem';

function Launcher({ hotel }: { hotel: Hotel }) {
  const [items, setItems] = useState<FrigobarItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const q = collection(db, 'hotels', hotel.id, 'items');
    const unsub = onSnapshot(
      q, 
      (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FrigobarItem));
        setItems(data.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        }));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, 'list', `hotels/${hotel.id}/items`)
    );
    return unsub;
  }, [hotel.id]);

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      const qty = quantities[item.id] || 0;
      return acc + (item.price * qty);
    }, 0);
  }, [items, quantities]);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  }, []);

  const shareToWhatsApp = () => {
    if (!roomNumber) {
      alert('Por favor, informe o número do apartamento.');
      return;
    }

    const consumedItems = items
      .filter(item => (quantities[item.id] || 0) > 0)
      .map(item => {
        const qty = quantities[item.id];
        return `${item.name} x ${qty}`;
      });

    if (consumedItems.length === 0) {
      alert('Nenhum item selecionado.');
      return;
    }

    const message = `UH: ${roomNumber}\n` +
      `Consumo:\n` +
      consumedItems.join('\n') + `\n\n` +
      `Total: R$ ${total.toFixed(2).replace('.', ',')}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
      <Loader2 className="animate-spin" style={{ color: hotel.color }} size={48} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preparando Frigobar...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="px-5 pt-6 pb-6 text-white relative rounded-b-[2.5rem] shadow-xl overflow-hidden" style={{ backgroundColor: hotel.color }}>
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Hotel Selecionado</p>
              <h1 className="text-xl md:text-2xl font-black leading-tight tracking-tight uppercase truncate drop-shadow-sm">{hotel.name}</h1>
            </div>
            
            <button 
              onClick={() => signOut(auth)} 
              className="text-[10px] uppercase font-black tracking-widest px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white rounded-xl flex items-center gap-1 shrink-0 border border-white/5"
            >
              Sair
            </button>
          </div>
          
          <div className="relative group w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors z-20 pointer-events-none">
              <User size={15} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Digite o Número do Apartamento"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-white text-slate-900 pl-11 pr-5 py-3 rounded-xl font-black text-sm shadow-xl placeholder:text-slate-300 focus:outline-none transition-all uppercase tracking-tighter"
            />
          </div>
        </div>
      </header>

      {/* Items List */}
      <main className="px-5 pt-6 pb-48 space-y-2.5 max-w-4xl mx-auto">
        <AnimatePresence>
          {items.map((item) => (
            <LauncherItem
              key={item.id}
              item={item}
              quantity={quantities[item.id] || 0}
              onUpdateQuantity={updateQuantity}
              hotelColor={hotel.color}
            />
          ))}
          {items.length === 0 && (
             <div className="text-center py-20 opacity-20 italic font-medium tracking-widest text-sm">NENHUM ITEM DISPONÍVEL</div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky Footer */}
      <AnimatePresence>
        {total > 0 && (
          <motion.footer 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl px-6 py-5 pb-8 border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] z-50 transition-all"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">TOTAL CONSUMO</p>
                  <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">R$ {total.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => setShowSummary(true)}
                  className="text-slate-500 font-bold text-xs uppercase tracking-widest underline underline-offset-4 decoration-slate-200 hover:text-slate-900 transition-colors"
                >
                  Ver Resumo
                </button>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setQuantities({})}
                  className="h-[52px] w-[52px] bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-500 rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-sm border border-rose-100/50"
                  title="Limpar tudo"
                >
                  <Trash2 size={20} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={shareToWhatsApp}
                  className="flex-1 bg-[#22C55E] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-green-100 hover:bg-[#1ebd53] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Send size={18} />
                  Enviar Consumo
                </button>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
           <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setShowSummary(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative bg-white w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-4xl p-10 md:p-12 shadow-2xl"
              >
                 <div className="mb-6 flex justify-end items-start text-xs font-black uppercase tracking-widest text-slate-400">
                    <button onClick={() => setShowSummary(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={20} /></button>
                 </div>

                 <div className="space-y-1 mb-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                    {items.filter(i => (quantities[i.id] || 0) > 0).map(item => (
                       <div key={item.id} className="flex justify-between items-baseline py-2.5 border-b border-slate-50 last:border-0">
                          <div className="flex flex-col gap-0.5">
                             <span className="font-bold text-slate-800 uppercase text-[13px] tracking-tight">{item.name}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{quantities[item.id]} UN × R$ {item.price.toFixed(2)}</span>
                          </div>
                          <span className="font-black text-slate-900 text-base tabular-nums tracking-tighter">R$ {(quantities[item.id] * item.price).toFixed(2)}</span>
                       </div>
                    ))}
                    {items.filter(i => (quantities[i.id] || 0) > 0).length === 0 && (
                       <div className="text-center py-12 flex flex-col items-center gap-4 text-slate-300">
                          <PackagePlus size={48} strokeWidth={1} />
                          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-50">Frigobar Vazio</p>
                       </div>
                    )}
                 </div>

                 <div className="flex justify-between items-center py-5 border-t-2 border-slate-900/5 mb-8">
                    <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Total Acumulado</span>
                    <span className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">R$ {total.toFixed(2)}</span>
                 </div>

                 <button 
                   onClick={() => setShowSummary(false)}
                   className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-200 hover:bg-black transition-all"
                 >
                   Continuar Lançando
                 </button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hotelUnsub: (() => void) | null = null;
    
    const authUnsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setError(null);
      
      if (hotelUnsub) {
        hotelUnsub();
        hotelUnsub = null;
      }

      if (u) {
        if (u.email === 'gerencia@frigoservice.com') {
          setHotel(null);
          setLoading(false);
        } else {
          setLoading(true);
          const q = query(collection(db, 'hotels'), where('loginEmail', '==', u.email));
          hotelUnsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
              setHotel({ id: snap.docs[0].id, ...snap.docs[0].data() } as Hotel);
              setError(null);
            } else {
              setHotel(null);
              // Only set error if we've waited a bit, to allow for registration race
              setTimeout(() => {
                if (auth.currentUser && !snap.empty === false) {
                   // Double check after 2 seconds
                   setError('Sua conta está sendo configurada ou o ID não foi encontrado.');
                }
              }, 3000);
            }
            setLoading(false);
          }, (err) => {
            console.error(err);
            setError('Erro ao carregar dados do hotel.');
            setLoading(false);
          });
        }
      } else {
        setHotel(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (hotelUnsub) hotelUnsub();
    };
  }, []);

  const handleLogin = async (id: string, pass: string) => {
    setError(null);
    const email = normalizeToEmail(id);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          // If user doesn't exist, register them on-demand with the password they provided (usually default '123456')
          await createUserWithEmailAndPassword(auth, email, pass);
          return;
        } catch (createErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (createErr.code === 'auth/email-already-in-use') {
            setError('Acesso negado. Verifique o ID e a Senha.');
          } else if (createErr.code === 'auth/weak-password') {
            setError('A senha deve conter pelo menos 6 caracteres (o padrão é 123456).');
          } else {
            setError('Acesso negado. Verifique o ID e a Senha.');
          }
          return;
        }
      }
      
      if (error.code === 'auth/wrong-password') {
        setError('Acesso negado. Verifique o ID e a Senha.');
      } else {
        setError('Ocorreu um erro ao tentar acessar. Verifique sua conexão.');
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) return <Login onLogin={handleLogin} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center max-w-md">
          <X className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-black mb-2">Erro</h2>
          <p className="text-slate-500 mb-6 font-medium">{error}</p>
          <button onClick={() => signOut(auth)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">Sair</button>
        </div>
      </div>
    )
  }

  if (user.email === 'gerencia@frigoservice.com') {
    return <AdminDashboard />;
  }

  if (hotel) {
    return <Launcher hotel={hotel} />;
  }

  return <div className="flex items-center justify-center h-screen bg-slate-50">Configurando ambiente...</div>;
}
