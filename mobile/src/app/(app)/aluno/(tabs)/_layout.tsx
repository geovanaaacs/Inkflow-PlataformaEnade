import { Tabs } from "expo-router/js-tabs";
import { tabIcon, tabScreenOptions } from "../../../../components/navigation";

export default function StudentTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="questoes" options={{ title: "Questões", tabBarIcon: tabIcon("list-outline") }} />
      <Tabs.Screen name="simulados" options={{ title: "Simulados", tabBarIcon: tabIcon("timer-outline") }} />
      <Tabs.Screen name="ranking" options={{ title: "Ranking", tabBarIcon: tabIcon("trophy-outline") }} />
      <Tabs.Screen name="conta" options={{ title: "Conta", tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs>
  );
}
