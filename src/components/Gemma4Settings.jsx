import React from 'react';

const Gemma4Settings = ({ settings, setSettings, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative w-64 h-full glass p-6 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold gradient-text">Settings</h2>
          <button 
            onClick={onClose}
            className="text-text-dim hover:text-text-main transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-2">
              Temperature ({settings.temperature})
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
              className="w-full accent-accent-purple"
            />
            <p className="text-xs text-text-dim mt-1">
              높을수록 창의적이고, 낮을수록 보수적입니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-2">
              Top K ({settings.top_k})
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1"
              value={settings.top_k}
              onChange={(e) => setSettings({...settings, top_k: parseInt(e.target.value)})}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-2">
              Token Limit ({settings.num_predict})
            </label>
            <input 
              type="number" 
              value={settings.num_predict}
              onChange={(e) => setSettings({...settings, num_predict: parseInt(e.target.value)})}
              className="w-full bg-bg-secondary border border-glass-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-purple"
            />
          </div>
        </div>

        <div className="absolute bottom-8 left-6 right-6">
          <button 
            onClick={onClose}
            className="w-full py-2 bg-accent-purple/20 hover:bg-accent-purple/30 border border-accent-purple/50 rounded-lg text-sm font-medium transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Gemma4Settings;
