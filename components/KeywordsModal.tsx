import React, { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';

interface KeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: string[];
  setKeywords: React.Dispatch<React.SetStateAction<string[]>>;
}

const KeywordsModal: React.FC<KeywordsModalProps> = ({ isOpen, onClose, keywords, setKeywords }) => {
  const [newKeyword, setNewKeyword] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemove = (word: string) => {
    setKeywords(keywords.filter(k => k !== word));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full mx-4 animate-fade-in">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Tag className="text-[#4f35f3]" size={24} />
          </div>
          Detection Keywords
        </h3>
        
        <p className="text-sm text-gray-500 mb-6">
          These words will be automatically flagged when scanning uploaded PDF referral packets.
        </p>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter a medical term..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f35f3] transition-all"
          />
          <button
            onClick={handleAdd}
            className="px-5 py-3 bg-[#0f0b29] text-white rounded-xl font-medium hover:bg-[#4f35f3] transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {keywords.map((word) => (
            <div 
              key={word}
              className="px-4 py-2 bg-purple-50 text-purple-900 rounded-full border border-purple-100 flex items-center gap-2"
            >
              <span className="font-medium">{word}</span>
              <button 
                onClick={() => handleRemove(word)}
                className="text-purple-400 hover:text-red-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {keywords.length === 0 && (
            <span className="text-gray-400 italic">No keywords defined. Add some above.</span>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeywordsModal;
