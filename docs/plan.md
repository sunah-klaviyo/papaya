---
view-start: 2026-05-04
---

## align: Disambiguate high level requirements and get product alignment
- owner: Sunah
- start: 2026-03-16
- end: 2026-04-10
- depends-on:

## tech-spec: Disambiguate technical requirements and produce tech spec
- owner: Sunah
- start: 2026-04-10
- end: 2026-05-22
- depends-on: align

## datastore: Build product datastore
- owner: Sunah
- start: 2026-05-27
- days: 5
- end: 2026-06-02
- depends-on: tech-spec

## evals: Evals
- owner: Sunah
- start: 2026-06-25
- days: 3
- end: 2026-06-29
- depends-on: tech-spec

## backfill: Design, build, and run Catalogs backfill
- owner: Meredith
- start: 2026-05-22
- days: 11
- end: 2026-06-05
- depends-on: tech-spec

## ingestion: Spin up infrastructure and build Catalogs ingestion pipeline
- owner: Meredith
- start: 2026-06-08
- days: 12
- end: 2026-06-23
- depends-on: tech-spec

## indexing: Design and build indexing with attribute filtering
- owner: Sunah
- start: 2026-06-03
- days: 10
- end: 2026-06-17
- depends-on: datastore

## tool-call: Implement tool call and update skills
- owner: Sunah
- start: 2026-06-18
- days: 5
- end: 2026-06-24
- depends-on: indexing

## rollout: Rollout
- owner: Sunah
- start: 2026-06-30
- days: 5
- end: 2026-07-06
- depends-on: ingestion, indexing, evals, tool-call

## pto: PTO
- Meredith: 2026-05-08
- Sunah: 2026-06-09
