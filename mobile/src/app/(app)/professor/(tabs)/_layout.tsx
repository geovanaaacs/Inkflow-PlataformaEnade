import { Tabs } from "expo-router/js-tabs";
import { tabIcon, tabScreenOptions } from "../../../../components/navigation";

export default function TeacherTabs() {
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="index" options={{ title: "Painel", tabBarIcon: tabIcon("stats-chart-outline") }} />
      <Tabs.Screen name="questoes" options={{ title: "Questões", tabBarIcon: tabIcon("list-outline") }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda", tabBarIcon: tabIcon("calendar-outline") }} />
      <Tabs.Screen name="conta" options={{ title: "Conta", tabBarIcon: tabIcon("person-circle-outline") }} />
    </Tabs>
  );
}
