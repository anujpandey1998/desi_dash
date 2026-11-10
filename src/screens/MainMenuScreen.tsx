import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MenuLayout } from "../components/MenuLayout";
import { Button, Card, Header } from "../components/ui";
import {
  BrandMascot,
  MascotAvatar,
  FEATURE_ART,
} from "../components/BrandMascot";
import {loadCharacter,loadCourierName,type CharacterId} from "../game3d/profile";
import { theme as t } from "../theme/theme";
import { loadHighScore, loadWalletCoins } from "../services/runnerPhotoService";
import { showRewardedReceipt, TEST_ADS } from "../services/adService";
import { loadDroneInventory, grantAdBenefit } from "../services/droneService";
import { ECONOMY } from "../constants/economy";
import {
  loadSoundSetting,
  loadVibrationSetting,
} from "../services/audioService";

export function MainMenuScreen({ navigation }: { navigation: any }) {
  const [courierName,setCourierName]=useState('Courier');
  const [character,setCharacter]=useState<CharacterId>('boy');
  const { width, height } = useWindowDimensions();
  const wide = width >= 700 || width > height;
  const [adBusy, setAdBusy] = useState(false),
    [rewardMessage, setRewardMessage] = useState("");
  const adLock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const earnCoins = async () => {
    if (adLock.current) return;
    adLock.current = true;
    setAdBusy(true);
    setRewardMessage("");
    try {
      const inventory = await loadDroneInventory();
      if (
        inventory.coinAdAt &&
        Date.now() - inventory.coinAdAt < ECONOMY.coinAdCooldownMs
      ) {
        setRewardMessage(
          "Your coin bonus is cooling down. Try again in a few minutes.",
        );
        return;
      }
      const receipt = await showRewardedReceipt();
      if (!receipt) {
        if (alive.current)
          setRewardMessage("Ad unavailable or closed early. No coins added.");
        return;
      }
      const data = await grantAdBenefit(receipt, "coins");
      if (alive.current) {
        setCoins(data.coins);
        setRewardMessage("Bonus collected! +" + ECONOMY.adCoins + " coins.");
      }
    } catch (error) {
      if (alive.current)
        setRewardMessage(
          error instanceof Error ? error.message : "Reward could not be saved.",
        );
    } finally {
      adLock.current = false;
      if (alive.current) setAdBusy(false);
    }
  };
  const [best, setBest] = useState(0),
    [coins, setCoins] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadCourierName().then(value=>{if(active)setCourierName(value);}).catch(()=>{});
      void loadCharacter().then(value=>{if(active)setCharacter(value);}).catch(()=>{});
      loadHighScore()
        .then((value) => {
          if (active) setBest(value);
        })
        .catch(() => {});
      loadWalletCoins()
        .then((value) => {
          if (active) setCoins(value);
        })
        .catch(() => {
          if (active) setCoins(null);
        });
      void loadSoundSetting().catch(() => {});
      void loadVibrationSetting().catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );
  return (
    <MenuLayout>
      <Header
        title="ROOFTOP RUSH"
        subtitle={`${courierName}, your city awaits!`}
        leading={<MascotAvatar size={42} />}
        trailing={
          <View
            accessibilityLabel={
              coins === null ? "Coin balance unavailable" : `${coins} coins`
            }
            style={s.wallet}
          >
            <Text style={s.coin}>●</Text>
            <Text style={s.walletText}>
              {coins === null ? "—" : coins.toLocaleString()}
            </Text>
          </View>
        }
      />
      <View style={[s.main, wide && s.wide]}>
        <View style={[s.heroColumn, wide && { flex: 1 }]}>
          <Card style={s.hero}>
            <View style={s.halo} />
            <View style={s.heroCopy}>
              <Text style={s.eyebrow}>READY TO RUSH?</Text>
              <Text accessibilityRole="header" style={s.title}>
                Chalo,{"\n"}let’s make{"\n"}a delivery!
              </Text>
              <View style={s.speech}>
                <Text style={s.speechText}>Bas ek aur run ✦</Text>
              </View>
            </View>
            <View style={s.character}>
              <BrandMascot character={character} size={275} />
            </View>
            <View style={s.roofEdge} />
          </Card>
          <Card style={s.record}>
            <Text style={s.trophy}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.recordLabel}>PERSONAL BEST</Text>
              <Text style={s.hint}>
                {best
                  ? "A new record is one run away."
                  : "Your rooftop story starts here."}
              </Text>
            </View>
            <Text style={s.recordValue}>
              {best.toLocaleString()}
              <Text style={s.unit}> pts</Text>
            </Text>
          </Card>
        </View>
        <View style={[s.actions, wide && { flex: 1 }]}>
          <Button
            title="LET’S PLAY"
            subtitle="Special deliveries. Big adventures."
            tone="green"
            onPress={() => !adLock.current && navigation.navigate("Game")}
            icon={<Text style={s.playIcon}>▶</Text>}
            accessibilityLabel="Play Rooftop Rush"
          />
          <Button
            title="Challenge a Friend"
            subtitle="Same rooftops. Friendly rivalry."
            tone="blue"
            onPress={() =>
              !adLock.current &&
              navigation.navigate("Challenges", { tab: "friends" })
            }
          />
          <Button title="Race your friends" subtitle="Live room - up to 4 players" tone="purple" onPress={()=>!adLock.current&&navigation.navigate("Rooms")}/>
          <View style={s.tiles}>
            <Button
              title="✦  Your Runner"
              subtitle="Outfits & profile"
              tone="teal"
              style={s.tile}
              onPress={() =>
                !adLock.current && navigation.navigate("Customize")
              }
            />
            <Button
              title="Daily Missions"
              subtitle="Play & earn coins"
              tone="orange"
              style={s.tile}
              onPress={() =>
                navigation.navigate("Challenges", { tab: "missions" })
              }
            />
          </View>
          <Button
            title="⚙  Settings"
            compact
            tone="panel"
            onPress={() => !adLock.current && navigation.navigate("Settings")}
          />
          <Text style={s.footer}>Swipe. Jump. Smile. Repeat.</Text>
        </View>
      </View>
      <Card style={{ gap: 12 }}>
        <Text
          style={{
            color: t.colors.gold,
            fontFamily: t.font.bold,
            fontSize: 17,
            fontWeight: "900",
          }}
        >
          A little coin boost?
        </Text>
        <Text style={s.hint}>
          Watch an optional rewarded {TEST_ADS ? "test " : ""}ad for{" "}
          {ECONOMY.adCoins} coins. Spend coins on a delivery drone during solo
          runs.
        </Text>
        <Button
          title={
            adBusy
              ? "Loading your ad…"
              : "Watch ad · +" + ECONOMY.adCoins + " coins"
          }
          compact
          tone="teal"
          disabled={adBusy}
          onPress={() => void earnCoins()}
        />
        {!!rewardMessage && (
          <Text accessibilityLiveRegion="polite" style={s.hint}>
            {rewardMessage}
          </Text>
        )}
      </Card>
      {wide && (
        <ImageBackground
          source={FEATURE_ART}
          style={s.banner}
          imageStyle={{ borderRadius: 22 }}
          accessibilityLabel="Rooftop Rush, special deliveries, big adventures"
        />
      )}
    </MenuLayout>
  );
}
const s = StyleSheet.create({
  wallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    paddingHorizontal: 13,
    backgroundColor: t.colors.night,
    borderWidth: 2,
    borderColor: t.colors.outline,
    borderRadius: t.radius.pill,
  },
  coin: { color: t.colors.gold, fontSize: 21 },
  walletText: {
    color: t.colors.cream,
    fontFamily: t.font.bold,
    fontSize: 16,
    fontWeight: "900",
  },
  main: { gap: t.space.lg },
  wide: { flexDirection: "row", alignItems: "center", gap: t.space.xl },
  heroColumn: { gap: t.space.md },
  hero: {
    height: 292,
    overflow: "hidden",
    backgroundColor: "#254F90",
    borderColor: "#477AC2",
    padding: 0,
  },
  halo: {
    position: "absolute",
    width: 260,
    height: 260,
    right: -44,
    top: 5,
    borderRadius: 140,
    backgroundColor: "#568DE14D",
  },
  heroCopy: {
    position: "absolute",
    top: 24,
    left: 19,
    zIndex: 1,
    maxWidth: "54%",
  },
  eyebrow: {
    color: "#B5D6FF",
    fontFamily: t.font.bold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    color: t.colors.cream,
    fontFamily: t.font.bold,
    fontWeight: "900",
    fontSize: 31,
    lineHeight: 36,
    marginTop: 12,
    letterSpacing: -0.6,
  },
  speech: {
    padding: 9,
    marginTop: 16,
    backgroundColor: t.colors.cream,
    borderRadius: 12,
    alignSelf: "flex-start",
    transform: [{ rotate: "-3deg" }],
  },
  speechText: {
    color: t.colors.ink,
    fontFamily: t.font.bold,
    fontWeight: "800",
    fontSize: 11,
  },
  character: { position: "absolute", right: -8, bottom: 6, zIndex: 2 },
  roofEdge: {
    position: "absolute",
    bottom: 0,
    height: 24,
    width: "100%",
    backgroundColor: "#122D54",
    borderTopWidth: 5,
    borderColor: "#8BA4C5",
  },
  record: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 18,
  },
  trophy: { fontSize: 26 },
  recordLabel: {
    color: t.colors.gold,
    fontFamily: t.font.bold,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1,
  },
  hint: {
    color: t.colors.muted,
    fontFamily: t.font.regular,
    fontSize: 11,
    marginTop: 2,
  },
  recordValue: {
    color: t.colors.text,
    fontFamily: t.font.bold,
    fontWeight: "900",
    fontSize: 22,
  },
  unit: { fontSize: 10, color: t.colors.muted },
  actions: { gap: t.space.md },
  playIcon: { fontSize: 24, color: t.colors.ink },
  tiles: { flexDirection: "row", gap: t.space.md },
  tile: { flex: 1 },
  footer: {
    color: t.colors.muted,
    textAlign: "center",
    fontFamily: t.font.regular,
    fontSize: 12,
  },
  banner: { width: "100%", aspectRatio: 2, marginTop: 8 },
});
