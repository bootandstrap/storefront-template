// Uncomment this file to enable instrumentation and observability using OpenTelemetry
// Refer to the docs for installation instructions: https://docs.medusajs.com/learn/debugging-and-testing/instrumentation

/**
 * Sink-neutral evidence boundary shared by callers of the Medusa runtime.
 * OpenTelemetry registration remains intentionally opt-in: no exporter or
 * OpenObserve dependency is required for local tests.
 */
export const evidenceInstrumentationContract = Object.freeze({
  schema: "bootandstrap.evidence-event/v1",
  service: "medusa",
  propagationHeaders: ["x-trace-id", "x-tenant-id"] as const,
  requiredFields: [
    "trace_id",
    "tenant_id",
    "revision",
    "operation",
    "outcome",
    "duration_ms",
    "error_class",
  ] as const,
  exporter: "otlp-compatible-optional",
})

// import { registerOtel } from "@medusajs/medusa"
// // If using an exporter other than Zipkin, require it here.
// import { ZipkinExporter } from "@opentelemetry/exporter-zipkin"

// // If using an exporter other than Zipkin, initialize it here.
// const exporter = new ZipkinExporter({
//   serviceName: 'my-medusa-project',
// })

// export function register() {
//   registerOtel({
//     serviceName: 'medusajs',
//     // pass exporter
//     exporter,
//     instrument: {
//       http: true,
//       workflows: true,
//       query: true
//     },
//   })
// }
