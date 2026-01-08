"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Card, Msg, Page, Title } from "../components/ui/ui";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace("/presets");
      else router.replace("/login");
    })();
  }, [router]);

  return (
    <Page>
      <Card>
        <Title size={22}>TimeLog</Title>
        <Msg>移動中...</Msg>
      </Card>
    </Page>
  );
}
