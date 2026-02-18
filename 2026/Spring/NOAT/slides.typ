// 1. Import the NEW version of Polylux (0.4.0)
#import "@preview/polylux:0.4.0": *

// 2. Setup the slide look manually (since themes were removed in 0.4.0)
#set page(paper: "presentation-16-9")
#set text(size: 25pt, font: "Arial")
#show heading: set block(below: 1.5em)
#set document(title: "Exploring AI assisted workflows for Alternate Media delivery")
#show footnote.entry: set text(size: 14pt, fill: black)

// ── Helper: annotate a slide as featured with an explanatory note ──
// Place #feature[] at the END of a #slide[] block.
// typst query extracts the note and embeds the page number in the value.
#let feature(note) = context [#metadata((
  type: "featured-slide",
  note: note,
  page: here().page(),
)) <featured-slide>]

// ── Engagement metadata ────────────────────────────────────────────
#metadata((
  title: "AI assisted workflows for Alternate Media delivery",
  event: "NOAT 2026: educATe and integrATe",
  year: "2026",
  term: "Spring",
  venue: "NOAT",
  location: "Virtual",
  date: "2026-02-06",
  collaborators: (),
  tags: ("accessibility", "PDF", "AI", "ePub"),
  blurb: "A practical overview of AI-assisted tooling for generating accessible alternate media formats, covering PDF splitting, ePub repackaging, and on-device TTS.",
  hero: "assets/gutenberg_press.png",
  thumb: "assets/tocgen.split.png"
)) <engagement>

// --- CONTENT ---

#slide[
  = AI assisted workflows for Alternate Media
  
  - Why?
  - How?
  - Examples!
  - Questions?

#place(top + left, dx: 11cm, dy: 4cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 12cm))
  ))
]

#slide[
  = Why bother with automation
  
  - Real dangers of unreliable outputs
  - Time spent on tools rather than outputs
  - BUT: Potential to go beyond PDF
  - AND: Learn about the AI landscape in the process
  
#place(top + left, dx: 16cm, dy: 8cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  ))

]

// 1. Define a "Process Box" style
#let process(body) = block(
  fill: luma(245),
  stroke: (left: 1pt + blue),
  inset: (y: 0.2em, x: 1em),
  outset: (y: 0.1em),
  radius: 4pt,
  width: 80%,
  body
)

#slide[
  = ePub and PDF basics
  
  - PDF promotes fixed layout and conveying meaning visually
    #process[
      Visual Display #sym.arrow.r (optional) Semantic Tags
    ]
  
  - ePub encourages detailed semantic roles and flexible layout
    #process[
      Semantic Tags #sym.arrow.r Visual Display
    ]

  #place(top + left, dx: 16cm, dy: 8cm,
    pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  )
  #feature("The direction of the arrow matters. PDF starts from a visual intention and optionally layers meaning on top — remediation as an afterthought. ePub inverts this: semantic structure comes first and display is derived from it. This distinction shapes every workflow decision that follows.")
]

#slide[
  = AI chat basics
  
  - The helpful assistant persona#footnote[
    #link("https://www.anthropic.com/research/assistant-axis")]
  - Prompting, tool use and instruction following
  - Custom instructions and context#footnote[
    #link("https://code.visualstudio.com/docs/copilot/customization/custom-instructions")]
  - Cardinal rule: verify outputs

#place(top + left, dx: 16cm, dy: 8cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  ))
]

#slide[
  = How do I get started
  
  - GitHub Education + VS Code to access Copilot for free\*
  - DISCLAIMER: Privacy... not as bad as one might think
  - REAL DISCLAIMER: Security... IT admin nightmare
  - ALSO: Big Tech... less can be more

#place(top + left, dx: 16cm, dy: 8cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  ))

]

#slide[
  = Example workflows
  
  - pdf.tocgen: PDF splitting from generated bookmarks 
  - MinerU: PDF conversion to HTML or Markdown (GPU) 
  - Built-in: ePub repackaging via VS Code Copilot
  - Kokoro TTS: on-device ePub audio conversion
  
#place(top + left, dx: 16cm, dy: 8cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  ))

]


#slide[
  = Semi-automated PDF splitting
  
    #figure(
      image("assets/tocgen.split.png", alt: "pdf.tocgen relies on three components to identify, record, and insert Table of Contents: , pdfxmeta, pdftocgen and pdftocio", width: 60%),
    )
  
    - Core library identifies headings using text-matching
    - VS Code Copilot generates wrap around functionality#footnote[
    #link("https://huggingface.co/spaces/adelevett/pdf.tocgen.split")
  ]
#feature("pdf.tocgen uses three composable CLI tools: pdfxmeta identifies candidate headings by font metrics, pdftocgen records them into a recipe file you can edit, and pdftocio injects the resulting table of contents back into the PDF. Copilot wraps the split logic around the generated bookmarks.")
  ]



#slide[
  = PDF conversion to HTML/Markdown

#grid(columns: (.8fr, 1.2fr), gutter: .1em)[

    - Vision-based text extraction with semantic classification
    - Potential for accessible output depends on document complexity
  ][
     #set align(right + horizon)
    #figure(
      image("assets/layout.png", alt: "MinerU performs object detection from images of PDF files in order to derive each text block's and reading order and outputs machine accessible text formats including markdown and JSON", width: 80%),
    )
  ]
  #feature("MinerU treats each PDF page as an image and applies object detection to identify text blocks, figures, and tables before classifying their reading order. The quality of the accessible output is bounded by how consistently the source document was structured — complex multi-column layouts with decorative elements remain challenging.")
]



#slide[
  = Repackaging ePub via Copilot

#grid(columns: (.8fr, 1.2fr), gutter: .1em)[

    - Extract a chapter from an ePub
    - Repackage and run automated verification checks
  ][
     #set align(right + horizon)
    #figure(
      image("assets/vscode.png", alt: "AI agent repackaging ePub via VS Code Copilot, with several fits and starts including creating a repackaged ePub with the wrong content", width: 80%),
    )
  ]

]


#slide[
  = ePubs with media overlay via Kokoro TTS
  
#grid(columns: (.8fr, 1.2fr), gutter: .1em)[

    - Pre-generate and embed audio as media overlay in ePub
    - Extend to other TTS engines using Copilot
  ][
     #set align(right + horizon)
    #figure(
      image("assets/thorium.png", alt: "Thorium Reader playing back TTS generated voice using ePub media overlay", width: 80%),
    )
  ]

]



#slide[
  = Note of appreciation and caution
  
  - None of these workflows require VS Code or Github Copilot
  - Just because it's ePub does not make it accessible (and vice versa for PDFs)
  - Accessibility remediation is not possible without human expertise
  
#place(top + left, dx: 16cm, dy: 8cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  ))

]

#slide[
  = Questions?

  - GitHub Copilot privacy policy#footnote[
    #link("https://docs.github.com/en/copilot/how-tos/manage-your-account/manage-policies")
  ]

  - pdf.tocgen library#footnote[
    #link("https://krasjet.com/voice/pdf.tocgen/")
  ]
  - MinerU GitHub#footnote[
    #link("https://github.com/opendatalab/MinerU")
  ]
  - ePub to Audio book project#footnote[
    #link("https://github.com/funway/audible-epub3-maker")
  ]
]

#slide[
  == Contact
  alexis.delevett\@gmail.com

#place(top + left, dx: 11cm, dy: 4cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 12cm))
  ))

]


#slide[
  = Bonus
  
  - Convert HTML back to PDF via luaLaTeX
  - New tagging engine as of November 2025
  - Support for images, tables, and math
  - LaTeX Tagging Project Usage Instructions#footnote[
    #link("https://latex3.github.io/tagging-project/documentation/usage-instructions")
  ]
  
#place(top + left, dx: 16cm, dy: 8cm,(pdf.artifact(image("assets/gutenberg_press.png", width: 8cm))
  ))

]
