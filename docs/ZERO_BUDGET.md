# Zero-budget development guide

Abhi paid hosting, paid build service, domain ya paid database lena zaroori nahi hai. Existing laptop/PC, phone aur internet use karenge. Unka electricity/data kharcha alag hai; project koi paid cloud account automatically create nahi karta.

## 1. Akele game khelo: offline

`artifacts/RooftopRush-0.3.0-test.apk` phone par copy karke install karo. Solo gameplay, coins, high score, outfits aur missions local storage mein save hote hain. Solo mode ke liye server ya login nahi chahiye. App uninstall/data clear karne se local progress mit sakti hai.

## 2. Changes ke baad APK banao: apne PC par

Project folder mein terminal kholo:

```powershell
npm ci
npm run typecheck
npm test
npm run test:social
npm run android:apk
npm run android:verify
```

Pehli baar dependencies ke liye internet lagega. Android Studio/SDK aur JDK 21 installed hone chahiye; is machine par pehle se configured hain. APK yahan milta hai:

`android/app/build/outputs/apk/release/app-release.apk`

EAS/cloud-build subscription ki requirement nahi hai. Abhi ka APK internal test key se signed hai; Play publication se pehle private upload key ka setup alag se karna hai.

## 3. Friends ke saath free temporary online test

Server tumhare PC par chalega. Cloudflare Quick Tunnel usko temporary HTTPS address deta hai; account/domain ki zaroorat nahi. Ye development/testing ke liye hai, permanent hosting ka promise nahi.

Windows par official cloudflared tool install karo. Official download instructions: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/

Official downloads page se apne Windows processor ke liye executable download karo. Use `cloudflared.exe` naam dekar project ke `tools` folder mein rakho. Launcher usko automatically dhund lega; downloaded executable Git mein upload nahi hoga. Agar pehle se PATH par installed hai toh file copy karna zaroori nahi.

Terminal dobara kholo, project folder mein:

```powershell
npm run friends:share
```

Terminal mein `https://something.trycloudflare.com` jaisa address aayega.

1. Apne aur dost ke phone par same test APK install karo.
2. Game mein Friends + Daily Missions kholo.
3. Dono phones par wahi HTTPS server address aur apna player name bharo.
4. Ek player CREATE FRIEND ROOM dabaye; room code dost ko bheje.
5. Dost code daal kar JOIN / REFRESH ROOM dabaye.
6. RACE THIS COURSE khelo. Results server verify karega; room leaderboard refresh karo.

PC on, internet connected aur terminal running rehna chahiye. Ctrl+C server/tunnel band karega. Tunnel restart karne par URL badal sakta hai; dono phones mein naya address save karo. URL jiske paas hai woh service access kar sakta hai, isliye sirf trusted testers ko bhejo aur real personal information mat daalo. Sirf challenge API share hoti hai, project files nahi.

Sirf PC par server health test karna ho toh `npm run friends:local` chalao; browser mein `http://127.0.0.1:8787/health` kholo. Ye loopback-only command khud public tunnel nahi banata. Release phone APK ko HTTPS URL chahiye; plain HTTP address ko phone mein mat use karo.

Reference: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## 4. Ads aur paise

Checked-in app/ad IDs Google test IDs hain. Test ads se income nahi hoti. Offline/ad unavailable hone par normal game khelna possible rehna chahiye. Abhi real ad IDs ya paid services set karna zaroori nahi. Future mein live ads integrate karte waqt development devices par test ads hi use karenge.

Google Play par naya developer account banane ki US$25 one-time registration fee hai. Agar account pehle se nahi hai aur budget zero hai, abhi APK ke through small private playtests karo; Play publication ko baad ka milestone rakho. Registration fee aur current requirements launch ke waqt official source se dobara check karna hai:
https://support.google.com/googleplay/android-developer/answer/6112435

## Best practices jo hum follow karenge

- Pehle responsive controls, crashes aur saved progress fix; phir extra graphics/features.
- Har stable version Git par commit; main ko working backup rakho.
- Room scores server par validate; phone ka bheja score blindly trust nahi karna.
- Tests ke liye pehle 3-5 friends aur actual low-end phones. FPS claim karne se pehle hardware par measure karna.
- Test ads rakho; gameplay ko ads ke bina bhi usable rakho.
- .env, private signing keys aur server/data.json ke run tokens Git par upload nahi karna. Server data ka private local backup rakho.
- Paid assets/plugins/API, billing-enabled Firebase/cloud plans ya subscriptions bina budget approval add nahi karna.
- Nayi feature chhote steps mein add, test, phir APK. Pehle log game dobara khelna chahein, uske baad monetization.

## Zero-budget ki practical limit

Offline game ko 24/7 cloud server nahi chahiye. Temporary friend tests free local setup par ho sakte hain, lekin tumhara PC band hone par doston ke online room/leaderboard requests nahi chalenge. Already-loaded runs offline complete ho sakte hain; upload ke liye server dubara reachable hona chahiye. Permanent public service, store fees aur existing hardware/internet ko hamesha-free assume nahi karenge.
