# Turning a Side Project Into a Hiring Signal

Subtitle: How I designed PECS to communicate engineering depth without relying on hype.

Tags: Software Engineering Career, Developer Tools, Portfolio Projects, AI Engineering, System Design

## The Portfolio Project Problem

Many side projects are hard to evaluate.

They may look polished in a screenshot but hide shallow implementation. Or they
may contain real engineering depth but fail to explain why the decisions matter.

I wanted PECS to be different. The goal was not just to build an AI tool. The
goal was to create a repository that communicates technical judgment to
engineers, hiring managers, and recruiters.

## What I Wanted the Project to Signal

A strong engineering project should show:

- Product thinking.
- System boundaries.
- Maintainable TypeScript.
- Runtime validation.
- Local-first privacy decisions.
- Search and ranking design.
- Editor integration.
- Desktop and CLI surfaces.
- Testing discipline.
- Clear documentation.

PECS was scoped around those signals.

## Avoiding Resume-Driven Architecture

There is a trap in portfolio projects: adding technologies because they sound
impressive.

I tried to make each major decision defensible:

- TypeScript because the project spans extension, desktop, CLI, and browser-like webview code.
- esbuild because the build pipeline should stay fast and simple.
- Zod because persisted local data still needs runtime validation.
- JSON flat-file storage because native database modules add Electron and extension friction.
- MiniSearch because keyword search matters for engineering identifiers.
- Embeddings because conceptual memory search matters too.
- Electron because the project needs a local always-on API surface.
- CLI because serious developer tools should be scriptable.

The result is not a pile of fashionable tools. It is a connected system.

## Documentation as Part of the Signal

A hiring signal does not stop at code.

A reviewer should be able to answer:

- What problem does this solve?
- How do I run it?
- What are the system boundaries?
- Where is data stored?
- What is optional versus required?
- How are AI providers configured?
- What commands can I trust?
- What tradeoffs did the builder make?

That is why PECS includes a README, dependency guide, quickstart, memory bank,
and technical blog series.

Good documentation shows respect for the next engineer. It also makes the
project easier to evaluate quickly.

## The Architecture Story

PECS has a clear narrative:

1. Capture engineering memory close to the work through a VS Code extension.
2. Store and validate it locally.
3. Retrieve it with keyword, semantic, and temporal search.
4. Turn repeated patterns into workflows.
5. Expose the system through a desktop API and CLI.
6. Keep AI provider choices explicit and replaceable.

That story is more valuable than any single feature. It shows the ability to
move from product pain to system architecture.

## What Recruiters Can Understand

Recruiters may not inspect every line of code, but they can understand outcomes:

- The project has a clear purpose.
- It has multiple working surfaces.
- It includes setup documentation.
- It has tests.
- It demonstrates AI engineering without pretending everything needs a cloud backend.
- It is written for other people to run.

That is credibility.

## What Engineers Can Inspect

Engineers can go deeper:

- Provider interfaces.
- Storage schemas.
- Search ranking.
- REST API routes.
- CLI command behavior.
- Webview boundaries.
- Workflow execution.
- Privacy decisions.
- Tests.

The goal is to make the repository reward inspection.

## Lessons Learned

The best portfolio projects are not necessarily the biggest. They are the ones
where the builder's judgment is visible.

A strong project says:

- I can identify a real problem.
- I can make tradeoffs.
- I can ship across surfaces.
- I can document what I built.
- I can explain why the design is shaped this way.

That is the signal PECS is designed to send.

## Closing

PECS is both a developer tool and a technical narrative. It shows how I think
about AI tooling, local-first systems, search, workflows, and developer
experience.

GitHub repository: https://github.com/ramesh-kumar-l/Personal-Engineering-Cognition-System
