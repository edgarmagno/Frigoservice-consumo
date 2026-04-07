/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  Plus, 
  Minus, 
  Send, 
  Hotel as HotelIcon, 
  ChevronRight, 
  X, 
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Item {
  id: string;
  name: string;
  price: number;
}

interface Hotel {
  id: string;
  name: string;
  color: string;
  items: Item[];
}

const HOTELS: Hotel[] = [
  {
    id: 'blue-tree',
    name: 'BLUE TREE PREMIUM MANAUS',
    color: '#004a99',
    items: [
      { id: '1', name: 'Água Sem Gás', price: 12.00 },
      { id: '2', name: 'Água Com Gás', price: 12.00 },
      { id: '3', name: 'Refrigerante', price: 10.00 },
      { id: '4', name: 'Cerveja Premium', price: 15.00 },
      { id: '5', name: 'Achocolatado', price: 9.00 },
      { id: '6', name: 'Água de Coco', price: 9.00 },
      { id: '7', name: 'Batata Chips', price: 18.00 },
      { id: '8', name: 'Chocolate', price: 12.00 },
    ]
  },
  {
    id: 'intercity',
    name: 'INTERCITY',
    color: '#e30613',
    items: [
      { id: '1', name: 'Água Mineral', price: 8.50 },
      { id: '2', name: 'Refrigerante Lata', price: 9.00 },
      { id: '3', name: 'Cerveja Long Neck', price: 14.00 },
      { id: '4', name: 'Suco Lata', price: 10.00 },
      { id: '5', name: 'Mix de Castanhas', price: 16.00 },
      { id: '6', name: 'Barra de Cereal', price: 7.00 },
    ]
  },
  {
    id: 'quality',
    name: 'QUALITY HOTEL',
    color: '#2d3e50',
    items: [
      { id: '1', name: 'Água 500ml', price: 7.00 },
      { id: '2', name: 'Coca-Cola', price: 8.50 },
      { id: '3', name: 'Heineken', price: 16.00 },
      { id: '4', name: 'Energético', price: 22.00 },
      { id: '5', name: 'Pringles', price: 25.00 },
    ]
  }
];

export default function App() {
  const [selectedHotel, setSelectedHotel] = useState<Hotel>(HOTELS[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [roomNumber, setRoomNumber] = useState('');
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const total = useMemo(() => {
    return selectedHotel.items.reduce((acc, item) => {
      const qty = quantities[item.id] || 0;
      return acc + (item.price * qty);
    }, 0);
  }, [selectedHotel, quantities]);

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const resetQuantities = () => {
    setQuantities({});
    setRoomNumber('');
  };

  const handleHotelChange = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setQuantities({});
    setIsHotelModalOpen(false);
  };

  const shareToWhatsApp = () => {
    if (!roomNumber) {
      alert('Por favor, informe o número do apartamento.');
      return;
    }

    const consumedItems = selectedHotel.items
      .filter(item => (quantities[item.id] || 0) > 0)
      .map(item => {
        const qty = quantities[item.id];
        return `• ${item.name}: ${qty}x R$ ${item.price.toFixed(2)} = R$ ${(qty * item.price).toFixed(2)}`;
      });

    if (consumedItems.length === 0) {
      alert('Nenhum item selecionado.');
      return;
    }

    const message = `*Lançamento de Frigobar*\n\n` +
      `*Hotel:* ${selectedHotel.name}\n` +
      `*Apto:* ${roomNumber}\n\n` +
      `*Itens Consumidos:*\n` +
      consumedItems.join('\n') + `\n\n` +
      `*Total: R$ ${total.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32">
      {/* Header */}
      <header 
        className="p-6 text-white rounded-b-3xl shadow-lg transition-colors duration-500"
        style={{ backgroundColor: selectedHotel.color }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs opacity-80 font-medium uppercase tracking-wider">Hotel Selecionado</p>
            <h1 className="text-xl font-bold leading-tight">{selectedHotel.name}</h1>
          </div>
          <button 
            onClick={() => setIsHotelModalOpen(true)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <HotelIcon size={20} />
          </button>
        </div>

        <div className="relative mt-6">
          <input
            type="text"
            placeholder="Número do Apto"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="w-full bg-white text-slate-900 px-4 py-3 rounded-xl font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-slate-400"
          />
        </div>
      </header>

      {/* Items List */}
      <main className="px-4 py-6 space-y-3">
        {selectedHotel.items.map((item) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-slate-100"
          >
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{item.name}</h3>
              <p className="text-sm text-slate-500">R$ {item.price.toFixed(2)}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => updateQuantity(item.id, -1)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-90 transition-all"
                style={{ color: (quantities[item.id] || 0) > 0 ? selectedHotel.color : undefined }}
              >
                <Minus size={18} />
              </button>
              
              <span className="w-6 text-center font-bold text-lg">
                {quantities[item.id] || 0}
              </span>
              
              <button 
                onClick={() => updateQuantity(item.id, 1)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-all"
                style={{ backgroundColor: selectedHotel.color }}
              >
                <Plus size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </main>

      {/* Footer Summary */}
      <AnimatePresence>
        {total > 0 && (
          <motion.footer 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-2xl z-40"
          >
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Total Consumo</p>
                  <p className="text-2xl font-black text-slate-900">R$ {total.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => setShowSummary(!showSummary)}
                  className="text-sm font-bold text-slate-600 underline underline-offset-4"
                >
                  {showSummary ? 'Esconder' : 'Ver Resumo'}
                </button>
              </div>

              {showSummary && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mb-4 max-h-40 overflow-y-auto space-y-1 pr-2"
                >
                  {selectedHotel.items.filter(i => (quantities[i.id] || 0) > 0).map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-slate-600">
                      <span>{quantities[item.id]}x {item.name}</span>
                      <span>R$ {(quantities[item.id] * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={resetQuantities}
                  className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
                  title="Limpar tudo"
                >
                  <Trash2 size={24} />
                </button>
                <button 
                  onClick={shareToWhatsApp}
                  className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <Send size={20} />
                  Enviar Consumo
                </button>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Hotel Selection Modal */}
      <AnimatePresence>
        {isHotelModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHotelModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-8 z-[60] max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-900">Mudar Hotel</h2>
                <button 
                  onClick={() => setIsHotelModalOpen(false)}
                  className="p-2 bg-slate-100 rounded-full text-slate-500"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {HOTELS.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => handleHotelChange(hotel)}
                    className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all border-2 ${
                      selectedHotel.id === hotel.id 
                        ? 'border-slate-900 bg-slate-50' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm" 
                        style={{ backgroundColor: hotel.color }}
                      />
                      <span className={`font-bold text-lg ${selectedHotel.id === hotel.id ? 'text-slate-900' : 'text-slate-600'}`}>
                        {hotel.name}
                      </span>
                    </div>
                    {selectedHotel.id === hotel.id ? (
                      <CheckCircle2 className="text-slate-900" size={24} />
                    ) : (
                      <ChevronRight className="text-slate-300" size={24} />
                    )}
                  </button>
                ))}
              </div>

              <p className="mt-8 text-center text-sm text-slate-400 font-medium">
                Ao trocar de hotel, os lançamentos atuais serão perdidos.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
