import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Shield,
  Users,
  Network,
  Gavel,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Compass,
  Play,
  HelpCircle,
} from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial?: () => void;
}

type GuideTab = 'TRIAD' | 'MODES' | 'BOARD' | 'HUD';

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  onStartTutorial,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('TRIAD');

  if (!isOpen) return null;

  const tabs: { id: GuideTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    {
      id: 'TRIAD',
      label: '1. Temel Kurallar & 3 Kanıt',
      shortLabel: '1. Kurallar',
      icon: <Shield size={14} />,
    },
    {
      id: 'MODES',
      label: '2. Oyun Modları & Roller',
      shortLabel: '2. Modlar',
      icon: <Users size={14} />,
    },
    {
      id: 'BOARD',
      label: '3. Kanıt Tahtası & İp',
      shortLabel: '3. Tahta',
      icon: <Network size={14} />,
    },
    {
      id: 'HUD',
      label: '4. Sekmeler & Tutuklama',
      shortLabel: '4. Tutuklama',
      icon: <Gavel size={14} />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-surface border border-subtle rounded-[6px] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-doc-open"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-4 py-3 bg-elevated border-b border-subtle flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[4px] bg-crimson/20 border border-crimson/50 flex items-center justify-center text-crimson shrink-0">
              <BookOpen size={17} />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-amber uppercase tracking-widest">
                [ DEDEKTİF SAHA EL KİTABI — AKADEMİ REHBERİ ]
              </div>
              <h2 className="font-serif font-bold text-base sm:text-lg text-primary truncate">
                EKSİK PARÇA Nasıl Oynanır?
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[4px] bg-primary border border-subtle hover:border-crimson text-secondary hover:text-primary flex items-center justify-center shrink-0"
            title="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 bg-primary border-b border-subtle shrink-0">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-2 font-mono text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  active
                    ? 'border-crimson text-primary bg-surface/90'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <span className={active ? 'text-crimson' : 'text-secondary'}>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 font-mono text-xs flex-1">
          {activeTab === 'TRIAD' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-[6px] bg-elevated border border-crimson/40">
                <div className="text-[11px] font-bold text-crimson uppercase mb-1">
                  🕵️ OYUNUN ALTIN FELSEFESİ
                </div>
                <p className="text-primary text-xs sm:text-sm font-serif italic leading-relaxed">
                  &ldquo;Kimse gerçeğin tamamına sahip değildir.&rdquo;
                </p>
                <p className="text-secondary text-[11px] mt-1.5 leading-relaxed">
                  EKSİK PARÇA, her oyuncunun farklı gizli belgelere sahip olduğu gerçek zamanlı bir{' '}
                  <strong className="text-primary">Asimetrik Dedektiflik Simülasyonudur</strong>.
                  Amacınız belgeler arasındaki çelişkileri yakalamak, kırmızı iple kanıtları
                  birleştirmek ve gerçek katili 3 kesin delille tutuklamaktır.
                </p>
              </div>

              {/* Solution Triad Visual Diagram */}
              <div className="p-3.5 rounded-[6px] bg-primary border border-subtle">
                <div className="text-xs font-bold text-amber uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  ÇÖZÜM ÜÇGENİ (3 KANIT KURALI — SOLUTION TRIAD)
                </div>
                <p className="text-[11px] text-secondary mb-3 leading-relaxed">
                  Masum şüphelilerin de suçu işlemek için <strong className="text-primary">Neden</strong>{' '}
                  veya <strong className="text-primary">Fırsatı</strong> olabilir (şaşırtmaca / red
                  herring). Ancak gerçek katil yalnızca şu <strong className="text-emerald">3 ayak</strong>{' '}
                  birleştiğinde kesinleşir:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-[4px] bg-surface border border-amber/40">
                    <div className="text-[10px] text-amber font-bold uppercase mb-1">
                      1. NEDEN (MOTIVE)
                    </div>
                    <div className="text-primary font-bold text-xs mb-1">Neden Öldürdü?</div>
                    <p className="text-[10px] text-secondary leading-relaxed">
                      Miras, şantaj, gizli borç, intikam veya ticari ihanet belgesi.
                    </p>
                  </div>

                  <div className="p-3 rounded-[4px] bg-surface border border-crimson/40">
                    <div className="text-[10px] text-crimson font-bold uppercase mb-1">
                      2. FIRSAT (OPPORTUNITY)
                    </div>
                    <div className="text-primary font-bold text-xs mb-1">Alibi Çürütme</div>
                    <p className="text-[10px] text-secondary leading-relaxed">
                      Kamera kaydı, kartlı geçiş logu veya baz istasyonu sinyaliyle yalanlanan ifade.
                    </p>
                  </div>

                  <div className="p-3 rounded-[4px] bg-surface border border-emerald/40">
                    <div className="text-[10px] text-emerald font-bold uppercase mb-1">
                      3. ADLİ DELİL (FORENSIC)
                    </div>
                    <div className="text-primary font-bold text-xs mb-1">Fiziksel İz</div>
                    <p className="text-[10px] text-secondary leading-relaxed">
                      Otopsi bulgusu, zehir şişesi, balistik iz veya tahtada açılan{' '}
                      <strong className="text-emerald">ÇIKARIM</strong> düğümü.
                    </p>
                  </div>
                </div>
              </div>

              {/* Difficulty Presets */}
              <div className="p-3.5 rounded-[6px] bg-primary border border-subtle">
                <div className="text-xs font-bold text-primary uppercase mb-2">
                  🎚️ 3 KADEMELİ ZORLUK MODU
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-[4px] bg-surface border border-emerald/40">
                    <div className="font-bold text-emerald">🟢 AKADEMİ (KOLAY)</div>
                    <div className="text-[10px] text-secondary mt-1">
                      +%35 Ek Süre • +1 Arşiv Jetonu • Sarı İpuçları Açık • Sadece -15sn Hata Cezası
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[4px] bg-surface border border-amber/40">
                    <div className="font-bold text-amber">🟡 STANDART (NORMAL)</div>
                    <div className="text-[10px] text-secondary mt-1">
                      15 Dakika • Şartname Dengesi • Hatalı Bağlantıda -30sn Süre & 5sn Tahta Kilidi
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[4px] bg-surface border border-crimson/40">
                    <div className="font-bold text-crimson">🔴 BAŞKOMİSER (UZMAN)</div>
                    <div className="text-[10px] text-secondary mt-1">
                      -%25 Kısıtlı Süre • Altı Çizili İpuçları Gizli • -60sn Ceza • +%50 XP Ödülü
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'MODES' && (
            <div className="space-y-3.5">
              {/* Solo Mode */}
              <div className="p-3.5 rounded-[6px] bg-primary border border-subtle">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber text-xs uppercase">
                    1. SOLO (TEK KİŞİLİK ARŞİV DEDEKTİFİ)
                  </span>
                  <span className="px-2 py-0.5 rounded-[2px] bg-amber/15 text-amber text-[10px] font-bold">
                    1 OYUNCU
                  </span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Tek başınıza çalışırken başlangıçta bazı belgeler açıktır, diğerleri{' '}
                  <strong className="text-primary">Merkez Arşivde Kilitlidir</strong>. Üst bardaki{' '}
                  <strong className="text-amber">♦ Arşiv Sorgu Jetonlarınızı</strong> harcayarak
                  doğru dosyaların kilidini açmalısınız. Jetonunuz biterse reklam/ek sorgu hakkı ile{' '}
                  <strong className="text-emerald">+1 Jeton</strong> alabilirsiniz.
                </p>
              </div>

              {/* Duo Mode */}
              <div className="p-3.5 rounded-[6px] bg-primary border border-subtle">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald text-xs uppercase">
                    2. DUO (2 KİŞİLİK ORTAKLAR MODU)
                  </span>
                  <span className="px-2 py-0.5 rounded-[2px] bg-emerald/15 text-emerald text-[10px] font-bold">
                    2 OYUNCU / AI BOT
                  </span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  <strong className="text-primary">Bilgi Sisi (Fog of Information):</strong> Kanıtlar
                  iki oyuncuya asimetrik olarak dağıtılır. Örneğin sizde{' '}
                  <em>&ldquo;Otopsi Raporu&rdquo;</em> varken ortağınızda{' '}
                  <em>&ldquo;Güvenlik Kamerası Kaydı&rdquo;</em> vardır. Birbirinizin ekranını
                  göremezsiniz; konuşarak önemli bulduğunuz belgeleri{' '}
                  <strong className="text-primary">Ortak Tahtaya</strong> iğnelemelisiniz!
                </p>
              </div>

              {/* Group / Dirty Cop Mode */}
              <div className="p-3.5 rounded-[6px] bg-crimson/10 border border-crimson/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-crimson text-xs uppercase">
                    3. GRUP MODU (3–6 KİŞİLİK &ldquo;KİRLİ POLİS / HAİN&rdquo;)
                  </span>
                  <span className="px-2 py-0.5 rounded-[2px] bg-crimson/20 text-crimson text-[10px] font-bold">
                    3–6 OYUNCU
                  </span>
                </div>
                <p className="text-[11px] text-secondary leading-relaxed mb-2">
                  Masada 3 veya daha fazla kişi olduğunda sistem gizlice 1 kişiyi{' '}
                  <strong className="text-crimson">KİRLİ POLİS (Hain)</strong> seçer!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2.5 rounded-[4px] bg-surface border border-emerald/40">
                    <div className="font-bold text-emerald mb-0.5">✓ SAHA DEDEKTİFLERİ:</div>
                    <p className="text-secondary">
                      Gerçek katili ve 3 kanıtı bularak çoğunluk oyuyla tutuklama yapmaya çalışır.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-[4px] bg-surface border border-crimson/40">
                    <div className="font-bold text-crimson mb-0.5">⚠️ KİRLİ POLİS (HAİN):</div>
                    <p className="text-secondary">
                      Gerçek katili ve suçu yıkması gereken masum şüpheliyi bilir. Yanlış bağlantılarla
                      süreyi eritir veya masumu tutuklatırsa kazanır!
                    </p>
                  </div>
                </div>
              </div>

              {/* Cafe Ergonomics */}
              <div className="p-3 rounded-[6px] bg-elevated border border-subtle flex items-center gap-3">
                <Fingerprint size={24} className="text-amber shrink-0" />
                <div className="text-[11px] text-secondary">
                  <strong className="text-primary">Kafe Ergonomisi (Gizli Rol Perdesi):</strong> Yan
                  yana oynarken kimsenin rolünüzü görmemesi için rolünüz yalnızca butona{' '}
                  <strong className="text-amber">parmağınızı basılı tuttuğunuzda</strong> görünür.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'BOARD' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-[6px] bg-primary border border-subtle space-y-3">
                <div className="text-xs font-bold text-amber uppercase">
                  🧶 ADIM ADIM KANIT TAHTASI & KIRMIZI İP KULLANIMI
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-3 rounded-[4px] bg-surface border border-subtle">
                    <div className="font-bold text-primary mb-1">ADIM 1: TAHTAYA İĞNELE</div>
                    <p className="text-secondary text-[10px] leading-relaxed">
                      <strong className="text-primary">2. BELGELERİM</strong> sekmesinden bir belgeyi
                      açın veya kart üzerindeki <strong className="text-amber">📌 Tahtaya As</strong>{' '}
                      butonuna dokunun. Belge artık tüm masanın gördüğü Ortak Tahtaya düşer.
                    </p>
                  </div>

                  <div className="p-3 rounded-[4px] bg-surface border border-subtle">
                    <div className="font-bold text-crimson mb-1">ADIM 2: KIRMIZI İP ÇEK</div>
                    <p className="text-secondary text-[10px] leading-relaxed">
                      <strong className="text-primary">3. ORTAK TAHTA</strong> sekmesinde bir kartın
                      sağ üstündeki <strong className="text-crimson">🔴 İğne (Pin)</strong>{' '}
                      noktasından diğer karta ip çekin veya mobil uyumlu{' '}
                      <strong className="text-amber">⚡ HIZLI BAĞLA</strong> çubuğunu kullanın.
                    </p>
                  </div>

                  <div className="p-3 rounded-[4px] bg-surface border border-emerald/40">
                    <div className="font-bold text-emerald mb-1">ADIM 3: ÇIKARIM AÇ</div>
                    <p className="text-secondary text-[10px] leading-relaxed">
                      Birbiriyle çelişen veya tamamlayan iki doğru belgeyi bağladığınızda tahtada
                      otomatik olarak yeni bir{' '}
                      <strong className="text-emerald">🔗 SİSTEM ÇIKARIMI</strong> kartı belirir!
                    </p>
                  </div>
                </div>
              </div>

              {/* Penalty Warning */}
              <div className="p-3.5 rounded-[6px] bg-crimson/10 border border-crimson/50 flex items-start gap-3">
                <AlertTriangle size={20} className="text-crimson shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <div className="font-bold text-crimson uppercase mb-0.5">
                    DİKKAT: RASTGELE İP ÇEKME CEZASI (ANTI-BRUTE-FORCE)
                  </div>
                  <p className="text-secondary leading-relaxed">
                    Tahtadaki her kanıtı rastgele birbirine bağlamaya çalışırsanız sistem bağlantıyı
                    reddeder: Ekran kırmızı sarsılır, soruşturma sürenizden{' '}
                    <strong className="text-crimson">-30 saniye</strong> düşülür ve tahtanız{' '}
                    <strong className="text-amber">5 saniye boyunca kilitlenir!</strong>
                  </p>
                </div>
              </div>

              {/* Mobile Controls Tip */}
              <div className="p-3.5 rounded-[6px] bg-elevated border border-subtle flex items-start gap-3">
                <Compass size={20} className="text-emerald shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <div className="font-bold text-primary uppercase mb-0.5">
                    📱 MOBİL DOKUNMATİK & YARDIMCI ARAÇLAR
                  </div>
                  <p className="text-secondary leading-relaxed">
                    • <strong className="text-primary">2 Parmakla Kıstır (Pinch-to-Zoom):</strong>{' '}
                    Tahtayı yakınlaştırıp uzaklaştırabilirsiniz.
                    <br />• <strong className="text-amber">💡 İpucu Butonu:</strong> Hangi iki kanıtı
                    bağlayacağınızı bulamadığınızda üst araç çubuğundaki{' '}
                    <strong className="text-amber">💡 İpucu</strong> butonuna basabilirsiniz.
                    <br />• <strong className="text-emerald">+ Ortak Kanıt:</strong> Tek başınıza Duo
                    modunu test ederken AI ortağınızın elindeki kanıtı tahtaya istemek için
                    kullanabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HUD' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-3 rounded-[6px] bg-primary border border-subtle">
                  <div className="font-bold text-amber mb-1">1. OLAY ÖZETİ SEKMESİ</div>
                  <p className="text-secondary text-[10px] leading-relaxed">
                    Olay yeri raporu, maktul bilgisi ve 3 şüphelinin ilk ifadeleri yer alır. Şüpheli
                    kartlarının sağ üstündeki etikete dokunarak{' '}
                    <strong className="text-crimson">⚠️ ŞÜPHELİ</strong> veya{' '}
                    <strong className="text-emerald">✓ TEMİZ</strong> notu düşebilirsiniz.
                  </p>
                </div>

                <div className="p-3 rounded-[6px] bg-primary border border-subtle">
                  <div className="font-bold text-amber mb-1">2. BELGELERİM SEKMESİ</div>
                  <p className="text-secondary text-[10px] leading-relaxed">
                    Size özel atanan adli raporlar, SMS dökümleri, banka dekontları ve ses
                    kayıtlarıdır. Belge içindeki sarı altı çizili kelimelere dokunarak{' '}
                    <strong className="text-amber">Fosforlu Kalemle</strong> vurgu yapabilirsiniz.
                  </p>
                </div>

                <div className="p-3 rounded-[6px] bg-primary border border-subtle">
                  <div className="font-bold text-amber mb-1">3. ORTAK TAHTA SEKMESİ</div>
                  <p className="text-secondary text-[10px] leading-relaxed">
                    İğnelenen tüm belgelerin ve kırmızı ip bağlantılarının yer aldığı gerçek zamanlı
                    kanıt tahtasıdır. Kart üzerindeki <strong className="text-primary">OKU</strong>{' '}
                    butonuna basarak belgeyi tam ekran inceleyebilirsiniz.
                  </p>
                </div>

                <div className="p-3 rounded-[6px] bg-crimson/10 border border-crimson/40">
                  <div className="font-bold text-crimson mb-1">4. TUTUKLA (SUÇLA) SEKMESİ</div>
                  <p className="text-secondary text-[10px] leading-relaxed">
                    Soruşturma tamamlandığında <strong className="text-primary">1 Şüpheli</strong> ve
                    suçunu kanıtlayan <strong className="text-primary">3 Adet Kanıt/Çıkarım</strong>{' '}
                    seçip <strong className="text-crimson">⚖️ KARARI MÜHÜRLE</strong> butonuna basın!
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-[6px] bg-elevated border border-subtle">
                <div className="font-bold text-primary text-xs mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald" />
                  BASKI GAZETE MANŞETİ & KARİYER XP SİSTEMİ
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Tüm oyuncular kararını mühürlediğinde (veya süre bittiğinde) ertesi günün{' '}
                  <strong className="text-primary">Gazete Manşeti</strong> basılır! Doğru tutuklama
                  ve yüksek kanıt isabeti size <strong className="text-amber">XP</strong>,{' '}
                  <strong className="text-emerald">Başarım Rozetleri</strong> ve{' '}
                  <em>Çaylak Memur &rarr; Efsanevi Kriminalist</em> rütbeleri kazandırır.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-4 py-3 bg-elevated border-t border-subtle flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-secondary">
            <HelpCircle size={14} className="text-amber shrink-0" />
            <span>Oyun içinde üst bardaki &ldquo;?&rdquo; butonundan bu rehbere her an ulaşabilirsiniz.</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onStartTutorial && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartTutorial();
                }}
                className="min-h-[38px] px-3.5 py-2 rounded-[4px] bg-amber hover:bg-amber/90 text-black font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Play size={13} />
                90 SN EĞİTİM VAKASINI BAŞLAT
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-[4px] bg-crimson hover:bg-crimson/90 text-white font-mono text-xs font-bold"
            >
              ANLADIM, KAPAT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
