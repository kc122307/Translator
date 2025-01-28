import { ArrowLeftRight, Check, Copy, History, Languages, Loader2, RefreshCcw, Upload, Volume2, Wand2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { createWorker, Worker } from 'tesseract.js';

interface OcrProgress {
  progress: number;
  status: string;
}

interface Translation {
  from: string;
  to: string;
  fromLang: string;
  toLang: string;
}

function App() {
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('es');
  const [copyingFrom, setCopyingFrom] = useState(false);
  const [copyingTo, setCopyingTo] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const languages = {
    "am-ET": "Amharic",
    "ar-SA": "Arabic",
    "be-BY": "Belarusian",
    "bem-ZM": "Bemba",
    "bi-VU": "Bislama",
    "bjs-BB": "Bajan",
    "bn-IN": "Bengali",
    "bo-CN": "Tibetan",
    "br-FR": "Breton",
    "bs-BA": "Bosnian",
    "ca-ES": "Catalan",
    "cop-EG": "Coptic",
    "cs-CZ": "Czech",
    "cy-GB": "Welsh",
    "da-DK": "Danish",
    "dz-BT": "Dzongkha",
    "de-DE": "German",
    "dv-MV": "Maldivian",
    "el-GR": "Greek",
    "en-GB": "English",
    "es-ES": "Spanish",
    "et-EE": "Estonian",
    "eu-ES": "Basque",
    "fa-IR": "Persian",
    "fi-FI": "Finnish",
    "fn-FNG": "Fanagalo",
    "fo-FO": "Faroese",
    "fr-FR": "French",
    "gl-ES": "Galician",
    "gu-IN": "Gujarati",
    "ha-NE": "Hausa",
    "he-IL": "Hebrew",
    "hi-IN": "Hindi",
    "hr-HR": "Croatian",
    "hu-HU": "Hungarian",
    "id-ID": "Indonesian",
    "is-IS": "Icelandic",
    "it-IT": "Italian",
    "ja-JP": "Japanese",
    "kk-KZ": "Kazakh",
    "km-KM": "Khmer",
    "kn-IN": "Kannada",
    "ko-KR": "Korean",
    "ku-TR": "Kurdish",
    "ky-KG": "Kyrgyz",
    "la-VA": "Latin",
    "lo-LA": "Lao",
    "lv-LV": "Latvian",
    "men-SL": "Mende",
    "mg-MG": "Malagasy",
    "mi-NZ": "Maori",
    "ms-MY": "Malay",
    "mt-MT": "Maltese",
    "my-MM": "Burmese",
    "ne-NP": "Nepali",
    "niu-NU": "Niuean",
    "nl-NL": "Dutch",
    "no-NO": "Norwegian",
    "ny-MW": "Nyanja",
    "ur-PK": "Pakistani",
    "pau-PW": "Palauan",
    "pa-IN": "Punjabi",
    "ps-PK": "Pashto",
    "pis-SB": "Pijin",
    "pl-PL": "Polish",
    "pt-PT": "Portuguese",
    "rn-BI": "Kirundi",
    "ro-RO": "Romanian",
    "ru-RU": "Russian",
    "sg-CF": "Sango",
    "si-LK": "Sinhala",
    "sk-SK": "Slovak",
    "sm-WS": "Samoan",
    "sn-ZW": "Shona",
    "so-SO": "Somali",
    "sq-AL": "Albanian",
    "sr-RS": "Serbian",
    "sv-SE": "Swedish",
    "sw-SZ": "Swahili",
    "ta-LK": "Tamil",
    "te-IN": "Telugu",
    "tet-TL": "Tetum",
    "tg-TJ": "Tajik",
    "th-TH": "Thai",
    "ti-TI": "Tigrinya",
    "tk-TM": "Turkmen",
    "tl-PH": "Tagalog",
    "tn-BW": "Tswana",
    "to-TO": "Tongan",
    "tr-TR": "Turkish",
    "uk-UA": "Ukrainian",
    "uz-UZ": "Uzbek",
    "vi-VN": "Vietnamese",
    "wo-SN": "Wolof",
    "xh-ZA": "Xhosa",
    "yi-YD": "Yiddish",
    "zu-ZA": "Zulu"
};


  const translateText = async (text: string, from: string, to: string) => {
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=${from}|${to}`
      );
      const data = await response.json();
      
      if (data.responseStatus === 200) {
        return data.responseData.translatedText;
      } else {
        throw new Error(data.responseDetails || 'Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  const processImage = async (imageUrl: string) => {
    if (!imageUrl || !imageUrl.startsWith('data:image')) {
      console.error('Invalid image format');
      return;
    }

    setIsProcessingImage(true);
    setOcrProgress(0);
    let worker: Worker | null = null;

    try {
      worker = await createWorker({
        logger: (m: OcrProgress) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
        errorHandler: (err: Error) => {
          console.error('Tesseract error:', err);
        }
      });

      console.log('Loading Tesseract...');
      await worker.load();
      console.log('Loading language...');
      await worker.loadLanguage('eng');
      console.log('Initializing...');
      await worker.initialize('eng');
      console.log('Starting recognition...');

      const { data } = await worker.recognize(imageUrl, {
        rotateAuto: true,
        tessedit_ocr_engine_mode: 1,
        preserve_interword_spaces: '1',
        tessedit_create_txt: '1',
        tessedit_pageseg_mode: '1'
      });

      if (!data || !data.text) {
        throw new Error('No text was recognized');
      }

      const cleanedText = data.text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n');

      setFromText(cleanedText);
      console.log('Recognition completed successfully');

    } catch (error) {
      console.error('OCR processing error:', error);
      setFromText('Error extracting text from image. Please try again.');
    } finally {
      if (worker) {
        try {
          await worker.terminate();
          console.log('Worker terminated successfully');
        } catch (termError) {
          console.error('Error terminating worker:', termError);
        }
      }
      setIsProcessingImage(false);
      setOcrProgress(0);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setSelectedImage(dataUrl);
        processImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTranslate = async () => {
    if (!fromText.trim() || isTranslating) return;
    
    setIsTranslating(true);
    try {
      const translatedText = await translateText(fromText, fromLang, toLang);
      setToText(translatedText);
      
      setRecentTranslations(prev => [{
        from: fromText,
        to: translatedText,
        fromLang,
        toLang
      }, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Translation error:', error);
      setToText('Translation error occurred. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setFromText(toText);
    setToText(fromText);
  };

  const handleCopy = async (text: string, isFromText: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isFromText) {
        setCopyingFrom(true);
        setTimeout(() => setCopyingFrom(false), 2000);
      } else {
        setCopyingTo(true);
        setTimeout(() => setCopyingTo(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const detectLanguage = async () => {
    if (!fromText.trim()) return;
    try {
      setFromLang('en');
    } catch (error) {
      console.error('Language detection error:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setSelectedImage(dataUrl);
          processImage(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Languages className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
              Universal Translator
            </h1>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <History className="w-5 h-5" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
              <div
                className={`mb-6 border-2 border-dashed border-gray-600 rounded-xl p-8 text-center ${
                  selectedImage ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
                } transition-colors`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                {!selectedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <p className="text-lg font-medium text-gray-300 mb-2">Upload an image for translation</p>
                    <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500 mt-2">Supports: JPG, PNG, GIF</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative rounded-lg overflow-hidden bg-gray-900">
                      <img
                        src={selectedImage}
                        alt="Uploaded"
                        className="max-h-64 mx-auto object-contain"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-300" />
                      </button>
                    </div>
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-gray-900/75 flex flex-col items-center justify-center">
                        <div className="flex items-center gap-2 text-purple-400 font-medium mb-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing image...</span>
                        </div>
                        <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-400 transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <select
                      value={fromLang}
                      onChange={(e) => setFromLang(e.target.value)}
                      className="p-2 border-none bg-transparent text-lg font-medium text-gray-300 focus:ring-0"
                    >
                      {Object.entries(languages).map(([code, name]) => (
                        <option key={code} value={code} className="bg-gray-800">
                          {name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={detectLanguage}
                      className="p-2 text-gray-400 hover:text-purple-400 rounded-lg hover:bg-gray-700 transition-colors"
                      title="Detect language"
                    >
                      <Wand2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      value={fromText}
                      onChange={(e) => setFromText(e.target.value)}
                      placeholder="Enter text to translate or upload an image..."
                      className="w-full h-40 p-4 rounded-xl bg-gray-700 border-gray-600 focus:border-purple-500 focus:ring-purple-500 text-gray-100 placeholder-gray-400 resize-none"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <span className="text-sm text-gray-400 self-end mr-2">
                        {fromText.length}/5000
                      </span>
                      <button
                        onClick={() => handleCopy(fromText, true)}
                        className="p-2 text-gray-400 hover:text-purple-400 rounded-full hover:bg-gray-600"
                        title="Copy text"
                      >
                        {copyingFrom ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleSpeak(fromText, fromLang)}
                        className="p-2 text-gray-400 hover:text-purple-400 rounded-full hover:bg-gray-600"
                        title="Listen"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    onClick={handleSwapLanguages}
                    className="p-3 bg-gray-700 rounded-full text-purple-400 hover:bg-gray-600 transition-colors transform hover:scale-110"
                    title="Swap languages"
                  >
                    <ArrowLeftRight className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <select
                      value={toLang}
                      onChange={(e) => setToLang(e.target.value)}
                      className="p-2 border-none bg-transparent text-lg font-medium text-gray-300 focus:ring-0"
                    >
                      {Object.entries(languages).map(([code, name]) => (
                      <option key={code} value={code} className="bg-gray-800">
                       {name}
                     </option>
                   ))}
                 </select>
               </div>
               <div className="relative">
                 <textarea
                   value={toText}
                   readOnly
                   placeholder="Translation"
                   className="w-full h-40 p-4 rounded-xl bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 resize-none"
                 />
                 <div className="absolute bottom-2 right-2 flex gap-2">
                   <span className="text-sm text-gray-400 self-end mr-2">
                     {toText.length}/5000
                   </span>
                   <button
                     onClick={() => handleCopy(toText, false)}
                     className="p-2 text-gray-400 hover:text-purple-400 rounded-full hover:bg-gray-600"
                     title="Copy translation"
                   >
                     {copyingTo ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                   </button>
                   <button 
                     onClick={() => handleSpeak(toText, toLang)}
                     className="p-2 text-gray-400 hover:text-purple-400 rounded-full hover:bg-gray-600"
                     title="Listen to translation"
                   >
                     <Volume2 className="w-5 h-5" />
                   </button>
                 </div>
               </div>
             </div>
           </div>

           <button
             onClick={handleTranslate}
             disabled={!fromText.trim() || isTranslating}
             className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isTranslating ? 'Translating...' : 'Translate'}
           </button>
         </div>
       </div>

       <div className={`md:col-span-1 transition-all duration-300 ${showHistory ? 'block' : 'hidden md:block'}`}>
         <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-semibold text-gray-200">Recent Translations</h2>
             <button
               onClick={() => setRecentTranslations([])}
               className="p-2 text-gray-400 hover:text-purple-400 rounded-lg hover:bg-gray-700"
               title="Clear history"
             >
               <RefreshCcw className="w-5 h-5" />
             </button>
           </div>
           {recentTranslations.length === 0 ? (
             <p className="text-gray-400 text-center py-4">No recent translations</p>
           ) : (
             <div className="space-y-4">
               {recentTranslations.map((translation, index) => (
                 <div key={index} className="p-3 bg-gray-700 rounded-lg">
                   <div className="flex justify-between text-sm text-gray-400 mb-1">
                     <span>{languages[translation.fromLang as keyof typeof languages]}</span>
                     <span>→</span>
                     <span>{languages[translation.toLang as keyof typeof languages]}</span>
                   </div>
                   <p className="text-sm mb-1 font-medium text-gray-200">{translation.from}</p>
                   <p className="text-sm text-gray-300">{translation.to}</p>
                 </div>
               ))}
             </div>
           )}
         </div>
       </div>
     </div>
   </div>
 </div>
);
}

export default App;