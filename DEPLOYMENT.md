# EKSİK PARÇA (THE MISSING PIECE) — CANLI YAYIN, VERİTABANI VE APK KILAVUZU

Bu doküman; projenin kod deposu (Git), gerçek zamanlı WebSocket oyun sunucusu, PostgreSQL veritabanı ve Android `.apk` / `.aab` üretim mimarisini adım adım açıklar.

---

## 1. Önerilen Canlı Yayın Mimarisi (Nereye Push Edeceğiz & Nerede Barındıracağız?)

**Eksik Parça**, anlık oda durumunu ve çift yönlü WebSocket (`ws://` / `wss://`) bağlantılarını canlı tutan **durumlu (stateful)** bir çok oyunculu sunucuya sahiptir. Bu nedenle Vercel/Netlify gibi yalnızca kısa ömürlü "Serverless Function" çalıştıran platformlar yerine aşağıdaki **3'lü Üretim Mimarisi** en doğru, en ekonomik ve en yüksek performanslı çözümdür:

| Katman | 1. Tercih (Önerilen) | Alternatif | Neden Bu Seçim? |
| --- | --- | --- | --- |
| **Kod Deposu (Git Push)** | **GitHub (Private Repo)** | GitLab | Railway, Render ve CI/CD süreçlerini her `git push` sonrasında otomatik tetikler. |
| **Oyun ve WebSocket Sunucusu** | **Railway.app** | **Fly.io** veya **Render** | Uzun süreli WebSocket bağlantılarını koparmaz, `Dockerfile` ve `railway.json` ile sıfır ayar gerektirir, tek tıkla Redis eklenebilir. |
| **Kalıcı Veritabanı (`PostgreSQL`)** | **Supabase PostgreSQL** | **Neon.tech** veya **Railway Postgres** | Şartnamedeki tabloları (`users`, `cases`, `user_entitlements`, `match_history`) ücretsiz başlangıç katmanında tutar; görsel tablo paneli ve otomatik yedekleme sunar. |

---

## 2. Adım Adım Canlıya Alma (Deployment)

### Adım 1: GitHub'a Push Etme
Proje klasöründe `.gitignore` hazırlandı ve gereksiz derleme önbellekleri hariç tutuldu:
```bash
git init
git add .
git commit -m "feat: Eksik Parca v2.0 production release"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/eksik-parca.git
git push -u origin main
```

### Adım 2: Supabase (veya Neon) Üzerinde PostgreSQL Açma
1. **Supabase** üzerinde yeni bir proje oluşturun.
2. **Project Settings → Database → Connection String (URI)** kısmından `postgresql://...` bağlantı adresini kopyalayın.
3. Tabloları elle oluşturmanıza bile gerek yoktur: Sunucumuz (`server/storageAdapter.mjs`) ilk açılışta `DATABASE_URL` ortam değişkenini gördüğü an `database/schema.sql` dosyasını otomatik çalıştırarak tüm tabloları ve vaka paketlerini kurar!

### Adım 3: Railway Üzerinde Sunucuyu Yayına Alma
1. **Railway.app** hesabınızla giriş yapıp **"New Project → Deploy from GitHub Repo"** seçeneğinden `eksik-parca` deponuzu seçin.
2. Projede `railway.json` ve `Dockerfile` hazır olduğu için Railway derlemeyi otomatik tanır.
3. Railway servisinizin **Variables** sekmesine şu değişkeni ekleyin:
   * `DATABASE_URL` = *(Adım 2'de aldığınız Supabase/Postgres URI adresi)*
4. **Settings → Networking → Generate Domain** butonuna basın (Örn: `https://eksik-parca-prod.up.railway.app`).
5. Tarayıcıdan `https://eksik-parca-prod.up.railway.app/api/health` adresini açtığınızda `"storage": "postgresql", "cases_loaded": 16` yanıtını göreceksiniz!

---

## 3. Mobil Android APK Üretimi ve Hibrit Çalışma Mimarisi

Uygulama hem **Canlı Bulut / LAN Sunucu Modu** hem de **Dahili Çevrimdışı APK Motoru (`offlineFallbackEngine.ts`)** ile donatılmıştır:
* APK'yı telefonunuza kurup internet veya sunucu olmadan açtığınızda bile tüm **16 vaka**, **Dedektif Profili**, **Solo Arşiv Modu** ve **AI Partnerli Modlar** sorunsuz çalışır.
* Çok oyunculu gerçek oda kurmak istediğinizde uygulama içindeki **5. SUNUCU** sekmesinden canlı Railway adresinizi (veya aynı Wi-Fi ağındayken bilgisayarınızın IP adresini, örn. `http://192.168.1.10:3001`) yazıp **BAĞLAN** demeniz veya derleme öncesi `.env.production` içine `VITE_API_BASE_URL=https://...` eklemeniz yeterlidir.

### Tek Komutla Yeni APK Derleme
```powershell
npm run apk:debug
```
Bu komut Vite paketini derler, Capacitor Android projesini senkronize eder ve çıktıyı doğrudan `release\EksikParca-v2.0.apk` konumuna kopyalar.
