"use client";

import { AlertCircle } from "lucide-react";
import { Button, Card, Empty } from "./ui";

export function Offline({ message }: { message: string }) {
  return (
    <Card>
      <Empty icon={<AlertCircle />} title="The study agent isn't running" body={<>{message}<br /><code className="mt-3 inline-block rounded-lg bg-surface-2 px-2 py-1 text-[12px]">cd backend && .venv/bin/uvicorn app.main:app --port 8010</code></>} action={<Button variant="secondary" onClick={() => location.reload()}>Try again</Button>} />
    </Card>
  );
}
