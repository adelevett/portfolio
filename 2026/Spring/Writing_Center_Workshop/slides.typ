// 1. Import the NEW version of Polylux (0.4.0)
#import "@preview/polylux:0.4.0": *

#metadata((
  title: "Accessibility Features 101 - Tools and Tips for Every Student",
  event: "DCR x Writing Center Collaborative Workshop",
  year: "2026",
  term: "Spring",
  venue: "CSM Writing Center",
  location: "San Mateo, CA",
  date: "2026-03-25",
  collaborators: ("Sarah Fama"),
  tags: ("accessibility", "text to speech", "PDF", "AI", "ePub"),
  blurb: "Introducing students to free and open-source text to speech tools and built-in accessibility features on common software and platforms.",
  hero: "assets/optofono.png",
  thumb: "assets/compression.png"
)) <engagement>

// 2. Setup the slide look manually (since themes were removed in 0.4.0)
#set page(paper: "presentation-16-9", fill: rgb("FAF9F6")) // A soft off-white/cream
#set text(size: 25pt, font: "Arial", fill: rgb("#3b3b3b"))
#show heading: set block(below: 1em)
#set document(title: "Accessibility Features 101")
#show footnote.entry: set text(size: 14pt, fill: black)
#set figure(supplement: none)

//3.
#show heading.where(level: 1): it => block(
  fill: rgb("#34597f"),
  
  // 1. Flatten the left side, keep the right side rounded
  radius: (right: 0.5em, left: 0pt), 
  
  inset: (x: 0.8em, y: 0.2em),
  
  // 2. Push the background color out into the left page margin
  outset: (left: 3cm, bottom: 0.2em), 
  
  text(fill: white, it)
)

//4. Link handling and indexing
// #indexed_link("url")[Descriptive text]
//   → renders only the descriptive text + a LNKn superscript in the body
//   → registers a metadata record for the link index
//
// #make-link-index()
//   → collects all indexed links and renders a numbered list
//     with back-links (↩) to each occurrence
#show link: it => text(fill: blue)[#underline(it)]
// Utilities
#let get-domain(url) = {
  // ensure a scheme is present so split("//") behaves
  let u = if url.contains("//") { url } else { "http://" + url }
  let host = u.split("//").last().split("/").first()
  let host = if host.contains("@") { host.split("@").last() } else { host }
  let host = if host.contains(":") { host.split(":").first() } else { host }
  if host.starts-with("www.") { host.slice(4) } else { host }
}

#let linkcnt = counter("link-index")

// Pill-style inline link: clickable box containing descriptive text and
// a small domain chip. Label is placed inside the clickable area.
#let linkcnt = counter("link-index")

#let indexed_link(url, body) = {
  linkcnt.step()
  context {
    let serial = str(linkcnt.get().first())
    let labelname = "_link:serial:" + serial
    link(url)[#body]
    [#metadata((
      serial:    serial,
      url:       url,
      body:      body,
      labelname: labelname,
    ))<_link>]
  }
}

#let make-link-index() = {
  heading(level: 1)[Links]
  context {
    let records = query(<_link>)
    if records.len() == 0 { emph[No indexed links found.]; return }
    enum(..records.map(rec => {
      let item = rec.value
      [#item.body — #link(item.url)[#item.url]]
    }))
  }
}

// --- CONTENT ---


#slide[
  // 1. Local override using it.body to stop the global rule
  #show heading.where(level: 1): it => align(center)[
    #block(
      fill: rgb("34597f"),
      radius: 0.5em,               
      inset: (x: 0.8em, y: 0.4em),
      outset: 0pt,                 
      // Using it.body extracts the text and breaks the double-bubble loop
      text(fill: white, weight: "bold", it.body) 
    )
  ]

  = Accessibility Features 101

== _What we'll cover today:_

   #set list(marker: [‣])

  - Devices
  - Browsers
  - Documents
 
  #place(bottom + right, dx: 0cm, dy: 2cm, pdf.artifact(image("assets/lady_reading.png", height: auto)))
#place(bottom + left, dx: -2cm, dy: 2cm, pdf.artifact(image("assets/qrcode.png", height: 6cm)))
//  #place(bottom + left)[
//  #text(size: 14pt)[Alexis Delevett, CSM DRC]
// ]

]



#slide[
  = Accessibility definition

 #indexed_link("https://www.oed.com/dictionary/accessible_adj?tab=etymology")[Oxford English Dictionary]: that can be reached; available, obtainable
 #linebreak()
#align(center)[
     #text(size: 22pt)[*For today: adjustments to complete a task while minimizing strain*]
  ]
//  #place(top + left, dx: 15cm, dy: 6cm,(pdf.artifact(image("assets/a11y.svg", width: 8cm))
//   ))
  #place(top + left, dx: 0cm, dy: 7cm,(pdf.artifact(image("assets/all_work_no_play_long.png", width: auto)
))
  )

]


#slide[
  = Locating accessibility features

#let pill(color, dash, it) = box(
  fill: white,
  stroke: (paint: color, thickness: 2pt, dash: dash),
  inset: (x: 10pt, y: 6pt),
  radius: 10pt,
  text(fill: luma(20), it)
)

#let os    = pill.with(rgb("#0057b7"), "solid")
#let app   = pill.with(rgb("#008000"), "dashed")
#let other = pill.with(rgb("#cc4400"), "dotted")

  #grid(columns: (1.1fr, .9fr), gutter: 1em,
    pdf.artifact(image("assets/night_sky.png", height: 75%)),
    [
      #set list(marker: [‣])
      - #os[Magnification]
      - #os[Color contrast]
      - #os[Live captions]
      - #app[Read aloud]
      - #other[Dictation]
      - #other[Focus / Do Not Disturb]
      
    ]
  )
  #set text(size: 0.8em)
  #place(bottom + center, dy: 2em,
  box(fill: luma(210), inset: 8pt, radius: 10pt,
    [#os[OS Accessibility] #h(2em) #app[App Menu] #h(2em) #other[Other System Settings]]
  )
)
]


#slide[
  = Accessibility flashback

Optophone vs Dictaphone (ca. 1930s)
//  #place(top + left, dx: 15cm, dy: 6cm,(pdf.artifact(image("assets/a11y.svg", width: 8cm))
//   ))
  #place(top + left, dx: -2cm, dy: 5cm,(figure(image("assets/optophone.jpg", width: 50%, alt: "Man dressed in business attite leaning slightly forward with his eyes closed appearing to focus intently on the audio received via earphones and originating from an Optophone, an early assistive reading device that converts text to sound at various pitches using a system of lights and photo cells."
)))
  )
  #place(top + right, dx: 3cm, dy: -2cm,(figure(image("assets/dictaphone.jpg", width: 50%, alt: "Man dressed in business attire sitting cross-legged on a comfortably upholsetered office chair while dictating for later transcriptopn by a dedicated assistant using a Dictaphone, an early assistive writing device that records spoken words onto wax cylinders."
)))
  )

    #place(bottom + right, dx: -5cm, dy: 3cm,(figure(image("assets/dict_oper.png", width: 33%, alt: "Woman wearing a formal dress sitting upright on an unupholsetered office chair while transcribing from the wax cylinders containing the recordings from the a Dictaphone."
)))
  )

]


#let kbd(it) = box(
  fill: luma(240),
  stroke: 0.5pt + luma(150),
  inset: (x: 6pt, y: 2pt),
  radius: 3pt,
  text(font: "DejaVu Sans Mono", size: 1em, it) 
)

#slide[
  = OS features

#table(
  columns: (2cm, auto, auto),
  inset: 10pt,
  align: horizon,
  stroke: none,
  table.hline(),
  table.vline(x: 0),
  table.vline(x: 2),
  table.vline(x: 3),
  table.header([], [Settings > Accessibility >], [Limitations]),
  table.hline(),

  table.cell(rowspan: 3)[#image("assets/apple.svg", width: auto)],
  [#indexed_link("https://support.apple.com/guide/mac-help/get-live-captions-of-spoken-audio-mchldd11f4fd/mac")[Live Captions]], table.cell(rowspan: 3)[Live Captions: Apple Silicon or iOS devices only],
  [#indexed_link("https://support.apple.com/guide/mac-help/zoom-in-on-whats-onscreen-mchl779716b8/mac")[Zoom] #kbd[⌥⌘=], #kbd[⌘ +]],
  [#indexed_link("https://support.apple.com/lv-lv/guide/mac-help/unac089/mac")[Display › Increase contrast]],
  table.hline(),

  table.cell(rowspan: 3)[#image("assets/windows.png", width: auto)],
  [#indexed_link("https://support.microsoft.com/en-us/windows/use-live-captions-to-better-understand-audio-b52da59c-14b8-4031-aeeb-f6a47e6055df")[Captions] #kbd[⊞ Ctrl L]], table.cell(rowspan: 3)[Captions: Does not capture mic by default],
  [#indexed_link("https://support.microsoft.com/en-us/windows/use-magnifier-to-make-things-on-the-screen-easier-to-see-414948ba-8b1c-d3bd-8615-0e5e32204198")[Magnifier] #kbd[⊞ +], #kbd[Ctrl +]],
  [#indexed_link("https://support.microsoft.com/en-us/windows/change-color-contrast-in-windows-fedc744c-90ac-69df-aed5-c8a90125e696")[Contrast themes]], [],
  table.hline(),
)
]


#slide[
  = OS Accessibility: Open source tool
#set terms(separator: [: ],)
 / #indexed_link("https://morphic.org/morphic-basic/")[Morphic Toolbar]:
One-click access to built-in accessibility and usability features on Windows & Mac.
   #set list(marker: [‣])

  - Adjust Text size
  - Toggle Magnifier
  - Copy screen snip to clipboard
  - Read aloud selected text
  - Adjust contrast & color


  #place(top + left, dx: 0cm, dy: 12cm,(pdf.artifact(image("assets/morphictoolbar.png", width: auto))
  ))
  #place(top + left, dx: 25cm, dy: 12cm,(pdf.artifact(image("assets/morphic-logo.svg", width: 8cm))
  ))
]



#slide[
  = Browser features
  
#table(
  columns: (auto, auto, auto, auto),
  inset: 10pt,
  align: horizon,
  stroke: none,

  table.hline(),
  table.vline(x: 0),
  table.vline(x: 3),
  table.vline(x: 4),

  table.header([], [App], [Feature], [Limitations]),
  table.hline(),

  // Chrome — 1 row
  pdf.artifact(image("assets/chrome.svg", width: 2cm)),
  [Chrome],
  [#indexed_link("https://support.google.com/chrome/answer/14218344?hl=en")[Reading mode]],
  table.cell(rowspan: 5)[
    #set list(marker: [‣])
    - Text-heavy pages only
    - Button controls to navigate audio (Chrome)
    - Click to skip on Desktop only (Edge)
    - Listen to Page iOS only (Safari)
  ],

  // Edge — 2 rows
  table.cell(rowspan: 2, align: horizon + center)[#pdf.artifact(image("assets/edge.svg", width: 2cm))],
  table.cell(rowspan: 2)[Edge],
  [#indexed_link("https://support.microsoft.com/en-us/topic/use-immersive-reader-in-microsoft-edge-78a7a17d-52e1-47ee-b0ac-eff8539015e1")[Immersive Reader]],
  [#indexed_link("https://www.microsoft.com/en-us/edge/features/read-aloud")[Read Aloud]],

  // Safari — 2 rows
  table.cell(rowspan: 2, align: horizon + center)[#pdf.artifact(image("assets/safari.svg", width: 2cm))],
  table.cell(rowspan: 2)[Safari],
  [#indexed_link("https://www.callscotland.org.uk/blog/the-brilliant-safari-reader-in-ios-18/")[Show Reader]],
  [#indexed_link("https://til.simonwillison.net/ios/listen-to-page")[Listen to page]],

  table.hline(),
)
]



// #slide[
//   = Potential pitfalls
// #set list(marker: [‣])
//   - Garbled voice output
//   - Dictation fails
//   - Crash on pinch-to-zoom
//   - Dark mode glitches
// Errors can seem random, resulting in #linebreak(justify: false) frustration and lost time

  
// #place(top + left, dx: 18cm, dy: 2cm,(pdf.artifact(image("assets/all_work_no_play.png", height: auto))
// ))

// ]


#slide[
  = In depth: Safari page menu

   #set terms(
spacing: 1.4em,separator: [: ],hanging-indent: 0pt)
  / Find: Search for text on the page
  / Adjust Font Size: Zoom in or out
  / Listen to Page: Read aloud
  / Show Reader: Text-only page view
  / Hide Distracting items: Remove #linebreak(justify: false)individual elements


  #place(top + left, dx: 15cm, dy: 2cm,(pdf.artifact(image("assets/safari_page_menu.png", width: 12cm))
  ))
  #place(top + left, dx: 18cm, dy: -.8cm,(pdf.artifact(image("assets/large_page_menu.png", width: 4cm))
  ))
]


#slide[
  = Open source: Mozilla Firefox
   #set terms(
spacing: 1.4em,separator: [: ],hanging-indent: 0pt)
  / Reader view: Simplify web pages
  / Text size: Adjust font & spacing
  / Theme: Apply color and contrast
  / Read aloud: Play back audio


  #place(top + left, dx: 13.5cm, dy: 2cm,(pdf.artifact(image("assets/moz_reader_view.png", width: 14cm))
  ))
  #place(top + left, dx: 19cm, dy: -.4cm,(pdf.artifact(image("assets/firefox.svg", width: 2cm))
  ))
]

#indexed_link("https://chromewebstore.google.com/detail/reader-view/ecabifbgmdmgdllomnfinbmaellmclnh")[_Reader View Chrome Extension_]: Uses Firefox Reader View and playback in Chrome

#slide[
  = Document features
  
#table(
  columns: (2cm, auto, 7cm, auto),
  inset: 10pt,
  align: horizon,
  table.header(
   [], [App], [Feature], [Limitations],
  ),
  [
    #pdf.artifact(image("assets/word.png", width: auto))
  ],
  [
    Word
  ],
    
  [
    #indexed_link("https://support.microsoft.com/en-us/office/use-immersive-reader-in-word-a857949f-c91e-4c97-977c-a4efcaf9b3c1")[Immersive Reader]
  ],
  [
    #set list(marker: [‣])
    - Click to skip on Desktop only
    - Reads _every_ character
  ],
  pdf.artifact(image("assets/acrobat.svg", width: auto)),
  "Acrobat",
  [
    #indexed_link("https://www.adobe.com/devnet-docs/acrobat/android/en/lmode.html")[Liquid Mode] / #indexed_link("https://www.adobe.com/acrobat/hub/how-to-read-pdf-aloud.html")[Read Aloud]
  ],
  [
    #set list(marker: [‣])
    - PDF overlay can be brittle
    - PDF can be images which need preprocessing (OCR)
    - Reads _every_ character
  ]
)
]

#slide[
= Online document conversion

  #grid(columns: (.8fr, 1.2fr), gutter: 1em,
    pdf.artifact(image("assets/sensus_access.png", height: 75%)),
    [
      #set terms(separator: [: ],hanging-indent: 0pt)
 / #indexed_link("https://www.sensusaccess.com/convert-a-file/")[SensusAccess]: Online file conversion, including OCR for image-based PDFs
      #set list(marker: [‣])
      - Upload file or enter URL
      - Select output file format (ePub, Word, PDF, etc)
      - Receive converted file by email
      
    ]
  )
]


// #slide[
// = Computers are not readers
// #grid(columns: (.8fr, 1.2fr), gutter: 1em,
//   pdf.artifact(image("assets/lady_reading.png", height: 75%)),
//   [
//     #set list(marker: [‣])
//     - Only able to follow pre-mapped instructions
//     - Limited by initial assumptions or design bias
//     - Extending functionality may break existing features
//     AI at least comes with a warning :-)
//   ]
// )
// ]
// Hypothesizing communicative intent to be tested against evidence https://aclanthology.org/2020.acl-main.463.pdf


#slide[
  = Dedicated apps for text-to-speech
  
#table(
  columns: (2cm, auto, 7cm, auto),
  inset: 10pt,
  align: horizon,
  table.header(
   [], [App], [Features], [Limitations],
  ),
  [
    #pdf.artifact(image("assets/natural_reader.webp", width: auto))
  ],
  [
    #indexed_link("https://www.naturalreaders.com/online/")[Natural Reader]
  ],
    
  [
    Unlimited use
    Fully offline
  ],
  [
    #set list(marker: [‣])
    - Reading order on complex layouts
    - Math
  ],
  pdf.artifact(image("assets/paper2audio.webp", width: auto)),
  [#indexed_link("https://www.paper2audio.com/")[Paper2Audio]],
  [
    Spelled out math, 
    images, tables
  ],
  [
    #set list(marker: [‣])
    - Limit 45 hr/week
    - Cloud preprocessing
    - Text only visual sync
  ]
)
]

#slide[
  = Limitations of AI visual understanding


  #place(top + left, dx: 0cm, dy: 2cm,(figure(image("assets/ai_text.png", width: auto, alt: "A passage of text rendered as color-coded horizontal blocks of pixels. Most blocks are blue, some are gray, and two are pink, with individual characters visible within each block."), caption: "Computer vision segmentation of a text passage")
  ))

]


#slide[
  = Note-taking with speech to text
  
#table(
  columns: (2cm, auto, 7cm, auto),
  inset: 10pt,
  align: horizon,
  table.header(
   [], [App], [Features], [Limitations],
  ),
  [
    #pdf.artifact(image("assets/apple.svg", width: auto))
  ],
  [
    Apple Notes
  ],
    
  [
    Recording, transcription, summary
  ],
  [
    #set list(marker: [‣])
    - Affects battery life
    - Accuracy varies
    - No multi-speaker ID 
  ],
  pdf.artifact(image("assets/otter.png", width: auto)),
  "Otter AI",
  [
    Same as Apple Notes, plus AI chat
  ],
  [
    #set list(marker: [‣])
    - Limited on free plan
    - Not ideal for adding your own notes
  ]
  
)
]

#slide[
= Note-taking with file organization

#indexed_link("https://www.lemoyne.edu/wp-content/uploads/2024/05/SSC-Note-Taking-Insert.pdf")[3-ring binder] vs #indexed_link("https://support.microsoft.com/en-us/office/dictate-your-notes-in-onenote-2f5d1549-afe1-4abd-95ff-829a839e3d00")[Microsoft OneNote]

  #place(top + left, dx: -4cm, dy: 5cm,(figure(image("assets/worn_binder.jpg", width: 65%, alt: "Well worn Michigan State University 3-ring binder with Richard Ford's handwritten Spring 1965 course schedule in tabular format on the inside of the binder jacket and handwritten English course notes visible in the open tab"
)))
  )
  #place(top + right, dx: 1cm, dy: 2cm,(figure(image("assets/onenote_dictate.png", width: 50%, alt: "Dictation option on the Home ribbon in Microst Onenote for the web  with input options for various primarily western languages"
)))
  )

    #place(bottom + right, dx: -1cm, dy: 1cm,(figure(image("assets/onenote_insert.png", width: 50%, alt: "Insert ribbon in Microsoft OneNote for the web showing options for inserting files, images, tables, and links with the file option selected to reveal options for inserting files as attachments of printouts"
)))
  )
]


// 1. Define a "Process Box" style
// This is purely cosmetic (layout), so it doesn't break semantics.
#let process(body) = block(
  fill: luma(245),            // Very light gray background
  stroke: (left: 1pt + blue), // Blue accent bar on the left
  inset: (y: 0.2em, x: 1em),  // Breathing room inside the box
  outset: (y: 0.1em),         // Breathing room outside (prevents cramping)
  radius: 4pt,                // Rounded corners
  width: 90%,                 // Slightly narrower to fit nicely in list
  body
)

// #slide[
//   = Accessibility features today
// #grid(columns: (.8fr, 1.2fr), gutter: 1em,
//   pdf.artifact(image("assets/cooking_reading.png", height: 75%)),
//   [
//     #set list(marker: [‣])
//   - Rule-based interpretation
//     #process[
//       Limited at outset #sym.arrow.r #linebreak(justify: false) Works in isolation
//     ]
  
//   - AI-based pattern matching
//     #process[
//       More flexible #sym.arrow.r #linebreak(justify: false) Unpredictable "cliff"
//     ]
//   ]
// )
// ]




// #slide[
//   = Open soure resources
  
// #table(
//   columns: (2cm, 4cm, auto, auto),
//   inset: 10pt,
//   align: horizon,
//   table.header(
//    [], [App], [Features], [Limitations],
//   ),
//   [
//     #image("assets/huggingface.png", width: auto)
//   ],
//   [
//     HF Spaces Demos
//   ],
    
//   [
//     Cloud-hosted access to machine learning models including for text to speech and speech to text
//   ],
//   [
//     #set list(marker: [‣])
//   - Limited access to cloud resources
//   - Local installation can be demanding
//   - Even smallest models can be slow without GPU
//   ],
//   image("assets/github.svg", width: auto),
//   "GitHub",
//   [
//     Resource for installation of custom applications for text to speech and speech to text
//   ],
//   [
//     #set list(marker: [‣])
//     - Potentially involves programming
//     - Requires awareness of security implications
//     - May not work as described with no recourse or support
//   ]
  
// )
// ]



#slide[
  = Protect your time and attention

    #set list(marker: [‣])
  - It's ok to be skeptical!
  - Imagine your ideal solution #linebreak()to understand your requirements
  - Prepare to compromise on #linebreak() elements that are not as important
#v(25pt)
#align(center)[
     #text(size: 22pt)[Wrangling file formats and software #linebreak() should not have to feel like a full time  job  #linebreak()-- it should just work]

  ]
   #place(top + left, dx: 15cm, dy: 2cm,(pdf.artifact(image("assets/imagination.png", height: 65%)))
)
]


#slide[
  = Feedback

#align(center)[#pdf.artifact(image("assets/qrcode.png", height: 65%))
#indexed_link("https://forms.gle/s1Z8zV5f9orbt21S8")[Feedback form & access to slides]]
]

#slide[
  #make-link-index()
]