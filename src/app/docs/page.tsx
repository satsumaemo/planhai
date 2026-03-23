"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { openApiSpec } from "@/lib/api/openapi";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SwaggerUI spec={openApiSpec} />
    </div>
  );
}
