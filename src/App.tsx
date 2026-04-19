/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, FormEvent } from 'react';
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
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Types ---

interface FrigobarItem {
  id: string;
  name: string;
  price: number;
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

// --- Components ---

function FrigoLogo({ className = "h-12" }: { className?: string }) {
  return (
    <div className={`${className}`}>
      <svg viewBox="0 0 100 100" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Frigobar Body */}
        <rect x="25" y="15" width="50" height="70" rx="4" fill="#1A1A3F" />
        {/* Door Line */}
        <line x1="70" y1="15" x2="70" y2="85" stroke="white" strokeWidth="1" className="opacity-20" />
        {/* Handle */}
        <rect x="68" y="40" width="4" height="15" rx="1" fill="#00AEEF" />
        {/* Top Detail */}
        <rect x="25" y="15" width="50" height="8" rx="2" fill="#00AEEF" className="opacity-40" />
        {/* Feet */}
        <rect x="30" y="85" width="6" height="3" fill="#1A1A3F" />
        <rect x="64" y="85" width="6" height="3" fill="#1A1A3F" />
      </svg>
    </div>
  );
}

function Login({ onLogin, onRegister }: { onLogin: (email: string, pass: string) => void, onRegister: (email: string, pass: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await onRegister(email, password);
      } else {
        await onLogin(email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#e2e8f0_0%,_transparent_50%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-4xl p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative z-10 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="mb-6 select-none">
            <FrigoLogo className="h-20" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight uppercase">Frigo Service</h1>
            <p className="text-slate-400 font-medium mt-1 text-sm">
              {isRegister ? 'Crie sua conta para começar' : 'Gestão de Consumo Inteligente'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Usuário (E-mail)</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={18} />
              <input
                type="email"
                id="usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
                className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-3xl outline-none transition-all font-semibold text-slate-900"
                placeholder="exemplo@frigoservice.com"
              />
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
                className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-3xl outline-none transition-all font-semibold text-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-display font-black text-lg shadow-xl shadow-slate-200 hover:shadow-2xl hover:bg-black active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isRegister ? 'Cadastrar Agora' : 'Acessar Console')}
          </button>

          <div className="text-center">
            <button 
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              {isRegister ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastrar'}
            </button>
          </div>
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
  const [hotelForm, setHotelForm] = useState({ name: '', loginEmail: '', color: '#004a99' });
  const [itemForm, setItemForm] = useState({ name: '', price: '' });

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'hotels'), 
      (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hotel));
        setHotels(data);
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
        setItems(data.sort((a, b) => a.name.localeCompare(b.name)));
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
    setHotelForm({ name: '', loginEmail: '', color: '#004a99' });
    setIsHotelModalOpen(true);
  };

  const openEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setHotelForm({ name: hotel.name, loginEmail: hotel.loginEmail, color: hotel.color });
    setIsHotelModalOpen(true);
  };

  const handleHotelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await updateDoc(doc(db, 'hotels', editingHotel.id), {
          ...hotelForm,
          loginEmail: hotelForm.loginEmail.toLowerCase()
        });
      } else {
        await addDoc(collection(db, 'hotels'), {
          ...hotelForm,
          loginEmail: hotelForm.loginEmail.toLowerCase()
        });
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
          price: isNaN(price) ? 0 : price
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

  const cloneItemsFrom = async (sourceHotelId: string) => {
    if (!selectedHotelId || !confirm('Copiar todos os itens e preços deste hotel? Itens com o mesmo nome serão duplicados.')) return;
    try {
      const sourceItemsSnap = await getDocs(collection(db, 'hotels', sourceHotelId, 'items'));
      const promises = sourceItemsSnap.docs.map(d => 
        addDoc(collection(db, 'hotels', selectedHotelId, 'items'), d.data())
      );
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
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <HotelBuilding size={20} />
          </div>
          <div>
            <h1 className="text-xl font-display font-black tracking-tight">Console Gerencial</h1>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)} 
          className="px-5 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-full transition-all flex items-center gap-2 text-xs font-bold"
        >
          <LogOut size={14} /> Sair
        </button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
        {/* Sidebar: Hotels List */}
        <div className="w-full md:w-85 bg-white border-r border-slate-100 flex flex-col h-full">
          <div className="p-6 flex justify-between items-center border-b border-slate-50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unidades</h2>
            <button 
              onClick={openAddHotel}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {hotels.map(hotel => (
              <button
                key={hotel.id}
                onClick={() => setSelectedHotelId(hotel.id)}
                className={`w-full group p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${
                  selectedHotelId === hotel.id 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1' 
                    : 'hover:bg-slate-50'
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
                    {hotel.loginEmail}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditHotel(hotel); }}
                    className={`p-2 rounded-lg transition-colors ${selectedHotelId === hotel.id ? 'hover:bg-white/20' : 'hover:bg-slate-200'}`}
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area: Items Management */}
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
          <AnimatePresence mode="wait">
            {!selectedHotelId ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 md:p-12 max-w-5xl mx-auto w-full"
              >
                {/* Modern Header */}
                <div className="bg-white rounded-4xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-white mb-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transform -rotate-3" style={{ backgroundColor: selectedHotel?.color }}>
                      <HotelBuilding size={36} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight mb-2 uppercase">{selectedHotel?.name}</h2>
                      <div className="flex flex-wrap gap-4 items-center">
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                          <User size={12} /> {selectedHotel?.loginEmail}
                        </span>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-100" style={{ backgroundColor: selectedHotel?.color }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsCloneModalOpen(true)}
                      className="px-5 py-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                      <Copy size={16} /> Clonar Itens
                    </button>
                    <button 
                      onClick={openAddItem}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                    >
                      <Plus size={18} /> Novo Item
                    </button>
                  </div>
                </div>

                {/* Modern Card List */}
                <div className="grid grid-cols-1 gap-4">
                  {items.map(item => (
                    <motion.div 
                      layout
                      key={item.id} 
                      className="bg-white group p-6 rounded-3xl border border-transparent hover:border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          <PackagePlus size={20} />
                        </div>
                        <div>
                          <p className="font-display font-black text-slate-900 text-lg uppercase tracking-tight">{item.name}</p>
                          <button 
                            onClick={() => openEditItem(item)}
                            className="text-slate-400 hover:text-slate-900 text-sm font-bold flex items-center gap-1 transition-colors"
                          >
                            R$ {item.price.toFixed(2)} <Edit size={10} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="bg-white/50 rounded-4xl border-2 border-dashed border-slate-200 p-20 text-center">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum item cadastrado</p>
                    </div>
                  )}
                </div>
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
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
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
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Email de Acesso</label>
                  <input 
                    type="email" required value={hotelForm.loginEmail}
                    onChange={e => setHotelForm({...hotelForm, loginEmail: e.target.value})}
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Cor da Interface</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" required value={hotelForm.color}
                      onChange={e => setHotelForm({...hotelForm, color: e.target.value})}
                      className="flex-1 p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold"
                    />
                    <input 
                      type="color" value={hotelForm.color}
                      onChange={e => setHotelForm({...hotelForm, color: e.target.value})}
                      className="w-16 h-16 rounded-3xl border-0 overflow-hidden cursor-pointer"
                    />
                  </div>
                </div>
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
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
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
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Preço Unitário (R$)</label>
                  <input 
                    type="number" step="0.01" required value={itemForm.price}
                    onChange={e => setItemForm({...itemForm, price: e.target.value})}
                    className="w-full p-5 bg-slate-50 focus:bg-white border-2 border-transparent focus:border-slate-900 rounded-3xl outline-none font-bold"
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
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
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
                      <span className="text-[10px] font-bold opacity-40 uppercase">{hotel.loginEmail}</span>
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
        setItems(data.sort((a, b) => a.name.localeCompare(b.name)));
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

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const shareToWhatsApp = () => {
    if (!roomNumber) {
      alert('Por favor, informe o número do apartamento.');
      return;
    }

    const consumedItems = items
      .filter(item => (quantities[item.id] || 0) > 0)
      .map(item => {
        const qty = quantities[item.id];
        return `* ${item.name}: ${qty}x R$ ${item.price.toFixed(2)} = R$ ${(qty * item.price).toFixed(2)}`;
      });

    if (consumedItems.length === 0) {
      alert('Nenhum item selecionado.');
      return;
    }

    const message = `UH: ${roomNumber}\n` +
      `Consumo:\n` +
      consumedItems.join('\n') + `\n\n` +
      `Total: R$ ${total.toFixed(2)}`;

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
      <header className="px-6 pt-10 pb-8 text-white relative rounded-b-[2.5rem] shadow-xl" style={{ backgroundColor: hotel.color }}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">HOTEL SELECIONADO</p>
              <h1 className="text-xl md:text-2xl font-black leading-tight tracking-tight uppercase drop-shadow-sm">{hotel.name}</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
               <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
                  <HotelBuilding size={20} />
               </div>
               <button onClick={() => signOut(auth)} className="text-[10px] uppercase font-bold opacity-50 underline text-white">Sair</button>
            </div>
          </div>

          <div className="relative max-w-[200px]">
            <input
              type="text"
              placeholder="Nº do Apto"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-base shadow-sm placeholder:text-slate-300 focus:outline-none ring-offset-2 focus:ring-4 focus:ring-black/10 transition-all uppercase tracking-tight"
            />
          </div>
        </div>
      </header>

      {/* Items List */}
      <main className="px-5 pt-6 pb-48 space-y-2.5 max-w-md mx-auto">
        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.01 }}
              className={`bg-white p-4 sm:p-5 rounded-3xl shadow-sm border transition-all duration-300 ${
                (quantities[item.id] || 0) > 0 ? 'border-slate-300 bg-white' : 'border-slate-100'
              } flex items-center justify-between`}
            >
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-0.5 leading-tight">{item.name}</h3>
                <p className="text-slate-400 text-xs sm:text-sm font-medium italic">R$ {item.price.toFixed(2)}</p>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <button 
                  onClick={() => updateQuantity(item.id, -1)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                    (quantities[item.id] || 0) > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-200 pointer-events-none'
                  }`}
                >
                  <Minus size={16} />
                </button>
                
                <span className="w-5 text-center font-bold text-base sm:text-lg tabular-nums">
                  {quantities[item.id] || 0}
                </span>
                
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
                  style={{ backgroundColor: hotel.color }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </motion.div>
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
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl px-6 py-5 pb-8 border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] z-50 transition-all"
          >
            <div className="max-w-md mx-auto">
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
                  onClick={() => { if(confirm('Limpar todos os lançamentos?')) setQuantities({}); }}
                  className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  title="Limpar tudo"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={shareToWhatsApp}
                  className="flex-1 bg-[#22C55E] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-green-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
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
                onClick={() => setShowSummary(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="relative bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
              >
                 <div className="mb-6 flex justify-between items-start">
                    <div>
                       <h2 className="text-xl font-black uppercase tracking-tight">Resumo do Consumo</h2>
                       <p className="text-slate-400 text-sm font-medium">Lançamento para o Apto: <span className="text-slate-900 font-black">{roomNumber || '---'}</span></p>
                    </div>
                    <button onClick={() => setShowSummary(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                 </div>
                 <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {items.filter(i => (quantities[i.id] || 0) > 0).map(item => (
                       <div key={item.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                          <div className="flex flex-col">
                             <span className="font-bold text-slate-700">{item.name}</span>
                             <span className="text-xs text-slate-400">{quantities[item.id]} x R$ {item.price.toFixed(2)}</span>
                          </div>
                          <span className="font-black text-slate-900">R$ {(quantities[item.id] * item.price).toFixed(2)}</span>
                       </div>
                    ))}
                    {items.filter(i => (quantities[i.id] || 0) > 0).length === 0 && (
                       <div className="text-center py-12 flex flex-col items-center gap-4 text-slate-300">
                          <PackagePlus size={48} strokeWidth={1} />
                          <p className="italic">Selecione itens para visualizar o resumo</p>
                       </div>
                    )}
                 </div>
                 <div className="flex justify-between items-center mb-8 p-6 bg-slate-50 rounded-3xl">
                    <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Total final</span>
                    <span className="text-2xl font-black text-slate-900">R$ {total.toFixed(2)}</span>
                 </div>
                 <button 
                   onClick={() => setShowSummary(false)}
                   className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200"
                 >
                   Voltar aos Itens
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
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.email === 'gerencia@frigoservice.com') {
          setHotel(null);
          setLoading(false);
        } else {
          // Fetch hotel by email
          try {
            const q = query(collection(db, 'hotels'), where('loginEmail', '==', u.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              setHotel({ id: snap.docs[0].id, ...snap.docs[0].data() } as Hotel);
            } else {
              setError('Hotel não cadastrado no banco de dados.');
              setHotel(null);
            }
          } catch (e) {
            console.error(e);
            setError('Erro ao carregar dados do hotel.');
          } finally {
            setLoading(false);
          }
        }
      } else {
        setHotel(null);
        setLoading(false);
      }
    });
  }, []);

  const handleLogin = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Acesso negado. Verifique e-mail e senha.');
      } else {
        setError('Ocorreu um erro ao tentar acessar. Verifique sua conexão.');
      }
    }
  };

  const handleRegister = async (email: string, pass: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      // Optional: Logic to create a hotel document if they aren't admin
      if (email !== 'gerencia@frigoservice.com') {
        const hotelName = email.split('@')[0].toUpperCase();
        await addDoc(collection(db, 'hotels'), {
          name: hotelName,
          loginEmail: email,
          color: '#0f172a'
        });
      }
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao realizar o cadastro. Tente novamente.');
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) return <Login onLogin={handleLogin} onRegister={handleRegister} />;

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
