// ------------------------------------------------------------
// Step 1: Wireframe state machine
// ------------------------------------------------------------
// This version deliberately uses placeholder marks. It validates:
//
// 1. The four-scene narrative structure.
// 2. Parameters (currentScene and explorer selections).
// 3. Triggers (buttons and select controls).
// 4. A consistent visual platform.
// 5. D3 rendering and scene transitions.
//
// Real FDA data will replace the placeholder arrays in Step 2.
// ------------------------------------------------------------

const scenes = [
  {
  id: "growth",
  eyebrow: "Scene 1 · Growth over time",
  title: "Medical AI entered slowly—then accelerated",
  body:
    "The FDA list remained sparse for nearly two decades before expanding rapidly in the late 2010s. Each dot represents one FDA list record, not necessarily one unique commercial product.",
  annotation:
    "",
  interaction:
    "Move across the timeline to compare the number of records associated with each decision year.",
  caption: "FDA final decision year · 1995–2026"
  },
  {
  id: "concentration",
  eyebrow: "Scene 2 · Concentration by specialty",
  title: "Most listed medical AI is concentrated in Radiology",
  body:
    "When the same FDA records are regrouped by their lead medical panel, the distribution becomes highly uneven. Radiology forms a much larger cluster than every other specialty.",
  annotation: "",
  interaction:
      "Hover over a cluster to compare its share. “Other panels” combines the remaining lead medical panels.",
  caption: "FDA lead medical panel · all 1,524 records"
  },
  {
      id: "trail",
      eyebrow: "Scene 3 · Following the public trail",
      title: "Authorization is visible. The next link is less consistent.",
      body:
        "Three audited devices reveal different paths from an FDA authorization record to publicly registered studies and results. The comparison measures public traceability—not clinical quality.",
      annotation:
        "A direct identifier creates the clearest trail. Name-based search introduces ambiguity, and an unresolved match does not mean that no clinical evidence exists.",
      interaction:
        "Choose a device to compare a clear, search-dependent, or unresolved public evidence trail.",
      caption:
        "Selected audited cases · FDA records and ClinicalTrials.gov"

  },
  {
    id: "explore",
    eyebrow: "Scene 4 · Reader-driven explorer",
    title: "Explore the full list—without overstating what was audited",
    body:
      "Regroup all FDA list records by medical specialty, decision period, or authorization pathway. The study-trace layer highlights only the three manually audited cases.",
    annotation:
      "A gray record in the study-trace layer means “not audited,” not “no evidence.” Only the three selected cases received manual evidence tracing.",
    interaction:
      "Change the grouping and evidence layer. The same records will move to their new positions.",
    caption:
      "All 1,524 FDA list records · interactive grouping"
  }
];

const state = {
  currentScene: 0,
  selectedTrail: "imagio",
  selectedStage: "registered-study",
  selectedExplorerDevice: "P200003",
  explorerGroup: "specialty",
  evidenceLayer: "regulatory"
};

let devices = [];
let evidenceTrails = [];

const trailStatusLabels = {
  confirmed: "Confirmed",
  "search-dependent": "Search-dependent",
  "not-posted": "No posted results",
  unresolved: "Unresolved",
  "not-reached": "Not reached"
};

function getSelectedTrail() {
  return (
    evidenceTrails.find(
      trail =>
        trail.id === state.selectedTrail
    ) ??
    evidenceTrails[0]
  );
}

function getSelectedStage(trail) {
  return (
    trail?.stages.find(
      stage =>
        stage.id === state.selectedStage
    ) ??
    trail?.stages[0]
  );
}

const ui = {
  progress: d3.select("#progress"),
  eyebrow: d3.select("#scene-eyebrow"),
  title: d3.select("#scene-title"),
  body: d3.select("#scene-body"),
  annotation: d3.select("#scene-annotation"),
  interaction: d3.select("#interaction-hint"),
  caption: d3.select("#visual-caption"),
  visual: d3.select("#visualization"),
  trailDetail: d3.select("#trail-detail"),
  trailControls: d3.select("#trail-controls"),
  previous: d3.select("#previous-button"),
  next: d3.select("#next-button"),
  counter: d3.select("#scene-counter"),
  explorerControls: d3.select("#explorer-controls"),
  explorerDetail: d3.select("#explorer-detail"),
  groupSelect: d3.select("#group-select"),
  evidenceSelect: d3.select("#evidence-select")
};

async function loadData() {
  const [loadedDevices,loadedEvidenceTrails] = await Promise.all([d3.json("data/devices.json"),d3.json("data/evidence-trails.json")]);

  evidenceTrails =loadedEvidenceTrails;

  devices = loadedDevices.map(function (device) {
    return {
      ...device,
      year: Number(device.year),
      date: new Date(
        device.date + "T00:00:00"
      )
    };
  });
  const annualCounts = d3.rollup(
    devices,
    values => values.length,
    device => device.year
  );

  const latestYear = d3.max(
    devices,
    device => device.year
  );

  const completeYears = Array.from(
    annualCounts,
    ([year, count]) => ({
      year,
      count
    })
  ).filter(record => record.year < latestYear);

  const peakYear = d3.greatest(
    completeYears,
    record => record.count
  );

  scenes[0].annotation =
    `${peakYear.year} contains ` +
    `${peakYear.count.toLocaleString()} records—` +
    `the highest complete-year count in this dataset. ` +
    `${latestYear} is shown as a partial year.`;

  console.log(
    `Loaded ${devices.length} FDA records`
  );

  const panelCounts = d3.rollup(
  devices,
  values => values.length,
  device => device.panel
  );

  const radiologyCount =
    panelCounts.get("Radiology") ?? 0;

  const radiologyPercent =
    radiologyCount /
    devices.length *
    100;

  scenes[1].annotation =
    `Radiology accounts for ` +
    `${radiologyCount.toLocaleString()} of ` +
    `${devices.length.toLocaleString()} records ` +
    `(${radiologyPercent.toFixed(1)}%).`;
  
  console.log(
  `Loaded ${evidenceTrails.length} evidence trails`
  );
}

async function initialize() {
  buildProgressIndicator();
  registerTriggers();

  try {
    await loadData();
    render();
  } catch (error) {
    console.error(
      "Failed to initialize the project:",
      error
    );

    d3.select("#visualization")
      .text(
        "The FDA device data could not be loaded."
      );
  }
}

function buildProgressIndicator() {
  ui.progress
    .selectAll("li")
    .data(scenes)
    .join("li")
    .attr("class", "progress-item")
    .text((scene, index) => `${index + 1}. ${shortSceneLabel(scene.id)}`);
}

function shortSceneLabel(sceneId) {
  return {
    growth: "Growth",
    concentration: "Concentration",
    trail: "Evidence trail",
    explore: "Explore"
  }[sceneId];
}

function registerTriggers() {
  ui.previous.on("click", () => {
    if (state.currentScene > 0) {
      state.currentScene -= 1;
      render();
    }
  });

  ui.next.on("click", () => {
    if (state.currentScene < scenes.length - 1) {
      state.currentScene += 1;
      render();
    }
  });

  ui.groupSelect.on("change", (event) => {
    state.explorerGroup = event.target.value;
    renderVisualization(scenes[state.currentScene]);
  });

  ui.evidenceSelect.on("change", (event) => {
    state.evidenceLayer = event.target.value;
    renderVisualization(scenes[state.currentScene]);
  });

  window.addEventListener(
    "resize",
    debounce(() => renderVisualization(scenes[state.currentScene]), 160)
  );
}

function renderTrailControls() {
  ui.trailControls
    .selectAll(".trail-case-button")
    .data(
      evidenceTrails,
      d => d.id
    )
    .join("button")
    .attr("type", "button")
    .attr(
      "class",
      "trail-case-button"
    )
    .classed(
      "is-active",
      d =>
        d.id === state.selectedTrail
    )
    .attr(
      "aria-pressed",
      d =>
        d.id === state.selectedTrail
    )
    .text(function (d) {
      return (
        d.device +
        " · " +
        d.label
      );
    })
    .on("click", function (event, d) {
      state.selectedTrail = d.id;

      renderTrailControls();
      renderTrailDetail();

      renderVisualization(scenes[state.currentScene]);
    });
}

function renderTrailDetail() {
  const trail =
    getSelectedTrail();

  const stage =
    getSelectedStage(trail);

  ui.trailDetail
    .selectAll("*")
    .remove();

  if (!trail || !stage) {
    return;
  }

  const heading = ui.trailDetail
    .append("div")
    .attr(
      "class",
      "trail-detail-heading"
    );

  heading
    .append("span")
    .attr(
      "class",
      "trail-detail-step"
    )
    .text(
      `Step ${stage.index ?? (
        trail.stages.indexOf(stage) + 1
      )} · ${stage.label}`
    );

  heading
    .append("span")
    .attr(
      "class",
      `trail-detail-status is-${stage.status}`
    )
    .text(
      trailStatusLabels[
        stage.status
      ] ?? stage.status
    );

  ui.trailDetail
    .append("p")
    .attr(
      "class",
      "trail-detail-text"
    )
    .text(stage.detail);

  if (stage.url) {
    ui.trailDetail
      .append("a")
      .attr(
        "class",
        "trail-detail-link"
      )
      .attr("href", stage.url)
      .attr("target", "_blank")
      .attr(
        "rel",
        "noopener noreferrer"
      )
      .text(
        "Open public source ↗"
      );
  } else {
    ui.trailDetail
      .append("span")
      .attr(
        "class",
        "trail-detail-unavailable"
      )
      .text(
        "No direct public link is assigned to this stage."
      );
  }
}

function getSelectedExplorerCase() {
  const trail =
    evidenceTrails.find(
      item =>
        item.submission ===
        state.selectedExplorerDevice
    ) ?? evidenceTrails[0];

  const device =
    devices.find(
      item =>
        item.id ===
        trail?.submission
    );

  const studyStage =
    trail?.stages.find(
      stage =>
        stage.id ===
        "registered-study"
    );

  return {
    trail,
    device,
    studyStage
  };
}

function renderExplorerDetail() {
  const {
    trail,
    device,
    studyStage
  } = getSelectedExplorerCase();

  ui.explorerDetail
    .selectAll("*")
    .remove();

  if (
    !trail ||
    !device ||
    !studyStage
  ) {
    return;
  }

  const header = ui.explorerDetail
    .append("div")
    .attr(
      "class",
      "explorer-detail-header"
    );

  const heading = header
    .append("div");

  heading
    .append("p")
    .attr(
      "class",
      "explorer-detail-kicker"
    )
    .text(
      "Manually audited case"
    );

  heading
    .append("h3")
    .text(device.device);

  heading
    .append("p")
    .attr(
      "class",
      "explorer-detail-meta"
    )
    .text(
      device.company +
      " · " +
      device.pathway +
      " " +
      device.id
    );

  header
    .append("span")
    .attr(
      "class",
      `trail-detail-status is-${studyStage.status}`
    )
    .text(
      trailStatusLabels[
        studyStage.status
      ] ?? studyStage.status
    );

  ui.explorerDetail
    .append("p")
    .attr(
      "class",
      "explorer-detail-text"
    )
    .text(studyStage.detail);

  const actions = ui.explorerDetail
    .append("div")
    .attr(
      "class",
      "explorer-detail-actions"
    );

  if (studyStage.url) {
    actions
      .append("a")
      .attr(
        "class",
        "explorer-detail-source"
      )
      .attr(
        "href",
        studyStage.url
      )
      .attr(
        "target",
        "_blank"
      )
      .attr(
        "rel",
        "noopener noreferrer"
      )
      .text(
        "Open public source ↗"
      );
  }

  actions
    .append("button")
    .attr("type", "button")
    .attr(
      "class",
      "explorer-detail-button"
    )
    .text(
      "Compare full five-step trail →"
    )
    .on("click", function () {
      state.currentScene = 2;
      state.selectedTrail =
        trail.id;
      state.selectedStage =
        "registered-study";

      render();

      document
        .querySelector(".story")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    });
}


function render() {
  const scene = scenes[state.currentScene];

  ui.eyebrow.text(scene.eyebrow);
  ui.title.text(scene.title);
  ui.body.text(scene.body);
  ui.annotation.text(scene.annotation);
  ui.interaction.text(scene.interaction);
  ui.caption.text(scene.caption);

  ui.counter.text(`Scene ${state.currentScene + 1} of ${scenes.length}`);
  ui.previous.property("disabled", state.currentScene === 0);
  ui.next
    .property("disabled", state.currentScene === scenes.length - 1)
    .text(state.currentScene === scenes.length - 1 ? "Story complete" : "Next →");

  ui.progress
    .selectAll(".progress-item")
    .classed("is-active", (_, index) => index === state.currentScene)
    .classed("is-complete", (_, index) => index < state.currentScene);

  ui.trailControls.property("hidden", scene.id !== "trail");
  ui.explorerControls.property("hidden", scene.id !== "explore");
  ui.explorerDetail.property("hidden",scene.id !== "explore");
  ui.trailDetail.property("hidden", scene.id !== "trail");
  
  if (scene.id === "trail") {
    renderTrailControls();
    renderTrailDetail();
  }
  if (scene.id === "explore") {renderExplorerDetail();}
  renderVisualization(scene);
}

function renderVisualization(scene) {
  const bounds =
    ui.visual.node().getBoundingClientRect();

  const width = Math.max(
    520,
    bounds.width
  );

  const height = 520;

  const sharedDeviceScene =
    scene.id === "growth" ||
    scene.id === "concentration";

  if (sharedDeviceScene) {
    // Remove an older non-shared SVG if the user
    // returned from Scene 3 or Scene 4.
    ui.visual
      .selectAll("svg:not(.main-chart)")
      .remove();

    const svg = ui.visual
      .selectAll("svg.main-chart")
      .data([null])
      .join("svg")
      .attr("class", "main-chart")
      .attr(
        "viewBox",
        `0 0 ${width} ${height}`
      )
      .attr("role", "img")
      .attr(
        "aria-label",
        scene.title
      );

    const layers = {
      backgrounds: svg
        .selectAll("g.background-layer")
        .data([null])
        .join("g")
        .attr("class", "background-layer"),

      devices: svg
        .selectAll("g.device-layer")
        .data([null])
        .join("g")
        .attr("class", "device-layer"),

      annotations: svg
        .selectAll("g.annotation-layer")
        .data([null])
        .join("g")
        .attr("class", "annotation-layer"),

      interactions: svg
        .selectAll("g.interaction-layer")
        .data([null])
        .join("g")
        .attr("class", "interaction-layer")
    };

    // Circles remain. Only scene-specific material
    // is removed and rebuilt.
    layers.backgrounds
      .selectAll("*")
      .remove();

    layers.annotations
      .selectAll("*")
      .remove();

    layers.interactions
      .selectAll("*")
      .remove();

    if (scene.id === "growth") {
      drawTimeline(
        layers,
        width,
        height
      );
    }

    if (scene.id === "concentration") {
      drawClusters(
        layers,
        width,
        height
      );
    }

    return;
  }

  if (scene.id === "trail") {
  ui.visual
    .selectAll("*")
    .remove();

  const svg = ui.visual
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width} ${height}`
    )
    .attr("role", "img")
    .attr(
      "aria-label",
      scene.title
    );

  drawEvidenceTrail(
    svg,
    width,
    height
  );

  return;
}


if (scene.id === "explore") {
  ui.visual
    .selectAll(
      "svg:not(.explorer-chart)"
    )
    .remove();

  const svg = ui.visual
    .selectAll(
      "svg.explorer-chart"
    )
    .data([null])
    .join("svg")
    .attr(
      "class",
      "explorer-chart"
    )
    .attr(
      "viewBox",
      `0 0 ${width} ${height}`
    )
    .attr("role", "img")
    .attr(
      "aria-label",
      scene.title
    );

  const layers = {
    nodes: svg
      .selectAll(
        "g.explorer-node-layer"
      )
      .data([null])
      .join("g")
      .attr(
        "class",
        "explorer-node-layer"
      ),

    annotations: svg
      .selectAll(
        "g.explorer-annotation-layer"
      )
      .data([null])
      .join("g")
      .attr(
        "class",
        "explorer-annotation-layer"
      )
  };

  layers.annotations
    .selectAll("*")
    .remove();

  drawExplorer(
    layers,
    width,
    height
  );
 }
}

function drawTimeline(layers, width, height) {
  const svg =
    layers.annotations;

  const deviceLayer =
    layers.devices;

  const interactionLayer =
    layers.interactions;

  const backgroundLayer =
    layers.backgrounds;
  const margin = {
    top: 70,
    right: 34,
    bottom: 68,
    left: 40
  };

  const earliestYear =
    d3.min(devices, d => d.year);

  const latestYear =
    d3.max(devices, d => d.year);

  const years = d3.range(
    earliestYear,
    latestYear + 1
  );

  const xScale = d3
    .scaleBand()
    .domain(years)
    .range([
      margin.left,
      width - margin.right
    ])
    .paddingInner(0.14);

  const devicesByYear = d3.group(
    devices,
    d => d.year
  );

  const yearTotals = years.map(function (year) {
    return {
      year,
      count:
        devicesByYear.get(year)?.length ?? 0
    };
  });

  const dotData = [];

  devicesByYear.forEach(
    function (yearDevices, year) {
      const sortedDevices =
        yearDevices.slice().sort(function (a, b) {
          return (
            d3.ascending(a.date, b.date) ||
            d3.ascending(a.id, b.id)
          );
        });

      sortedDevices.forEach(
        function (device, stackIndex) {
          dotData.push({
            ...device,
            stackIndex
          });
        }
      );
    }
  );

  const baseline =
    height - margin.bottom;

  const columnsPerYear = 5;

  const radius = Math.max(
    1.5,
    Math.min(
      2.35,
      xScale.bandwidth() / 7
    )
  );

  const verticalGap =
    radius * 2 + 0.7;

  // Highlight that 2026 is not a complete year.
  backgroundLayer
    .append("rect")
    .attr("x", xScale(2026))
    .attr("y", margin.top)
    .attr(
      "width",
      xScale.bandwidth()
    )
    .attr(
      "height",
      baseline - margin.top
    )
    .attr("fill", "#edf2f3");

  const yearSummary = svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", 32)
    .attr("class", "timeline-summary")
    .text(
      `${devices.length.toLocaleString()} FDA list records`
    );

  svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", 53)
    .attr("class", "timeline-instruction")
    .text(
      "Hover over a year to see its record count."
    );

  const timelineX = function (d) {
  const column =
    d.stackIndex %
    columnsPerYear;

  const columnWidth =
    xScale.bandwidth() /
    columnsPerYear;

  return (
    xScale(d.year) +
    columnWidth * column +
    columnWidth / 2
  );
};

const timelineY = function (d) {
  const row = Math.floor(
    d.stackIndex /
    columnsPerYear
  );

  return (
    baseline -
    radius -
    row * verticalGap
  );
};

const circles = deviceLayer
  .selectAll(".device-dot")
  .data(
    dotData,
    d => d.id
  )
  .join(
    enter => enter
      .append("circle")
      .attr(
        "class",
        "device-dot"
      )
      .attr("cx", timelineX)
      .attr("cy", baseline)
      .attr("r", radius)
      .attr("opacity", 0),

    update => update,

    exit => exit.remove()
  );

circles
  .classed("is-year-highlighted", false)
  .classed("is-year-muted", false)
  .classed("is-cluster-highlighted", false)
  .classed("is-cluster-muted", false)
  .interrupt("layout")
  .transition("layout")
  .duration(900)
  .delay(function (d) {
    const yearDelay =
      (d.year - earliestYear) *
      18;

    return Math.min(
      yearDelay +
      d.stackIndex * 0.3,
      1100
    );
  })
  .ease(d3.easeCubicInOut)
  .attr("cx", timelineX)
  .attr("cy", timelineY)
  .attr("r", radius)
  .attr("opacity", 0.78);

  const axis = d3
    .axisBottom(xScale)
    .tickValues([
      1995,
      2000,
      2005,
      2010,
      2015,
      2020,
      2025,
    ])
    .tickSizeOuter(0);

  svg
    .append("g")
    .attr(
      "transform",
      `translate(0, ${baseline + 10})`
    )
    .call(axis);

  svg
    .append("text")
    .attr(
      "x",
      xScale(2026) +
      xScale.bandwidth() / 2
    )
    .attr("y", margin.top - 8)
    .attr("text-anchor", "middle")
    .attr("class", "partial-year-label")
    .text("Partial year");

    const accelerationStart = 2016;
  const accelerationEnd = 2025;

  const startRecord =
    yearTotals.find(
      record =>
      record.year === accelerationStart
    );

  const endRecord =
    yearTotals.find(
      record =>
        record.year === accelerationEnd
    );

  const annotationStartX =
    xScale(accelerationStart) +
    xScale.bandwidth() / 2;

  const annotationEndX =
    xScale(accelerationEnd) +
    xScale.bandwidth() / 2;

  const annotationMiddleX =
    (
      annotationStartX +
      annotationEndX
    ) / 2;

  const annotationY = margin.top + 28;

  const accelerationAnnotation = svg
    .append("g")
    .attr(
      "class",
      "timeline-annotation"
    );

  accelerationAnnotation
    .append("line")
    .attr("class", "timeline-annotation-line")
    .attr("x1", annotationStartX)
    .attr("x2", annotationEndX)
    .attr("y1", annotationY)
    .attr("y2", annotationY);

  accelerationAnnotation
    .append("line")
    .attr("class", "timeline-annotation-line")
    .attr("x1", annotationStartX)
    .attr("x2", annotationStartX)
    .attr("y1", annotationY - 5)
    .attr("y2", annotationY + 5);

  accelerationAnnotation
    .append("line")
    .attr("class", "timeline-annotation-line")
    .attr("x1", annotationEndX)
    .attr("x2", annotationEndX)
    .attr("y1", annotationY - 5)
    .attr("y2", annotationY + 5);

  accelerationAnnotation
    .append("text")
    .attr(
      "class",
      "timeline-annotation-heading"
    )
    .attr("x", annotationMiddleX)
    .attr("y", annotationY - 12)
    .attr("text-anchor", "middle")
    .text(
      "Rapid expansion after the mid-2010s"
    );

  accelerationAnnotation
    .append("text")
    .attr(
      "class",
      "timeline-annotation-detail"
    )
    .attr("x", annotationMiddleX)
    .attr("y", annotationY + 18)
    .attr("text-anchor", "middle")
    .text(
      `${startRecord.count} records in ` +
      `${accelerationStart} → ` +
      `${endRecord.count} in ` +
      `${accelerationEnd}`
    );

  // Invisible year-sized rectangles make hovering easy.
  interactionLayer
    .append("g")
    .selectAll(".year-hit-area")
    .data(yearTotals)
    .join("rect")
    .attr("class", "year-hit-area")
    .attr("x", d => xScale(d.year))
    .attr("y", margin.top)
    .attr(
      "width",
      xScale.bandwidth()
    )
    .attr(
      "height",
      baseline - margin.top
    )
    .attr("fill", "transparent")
    .on(
      "mouseenter",
      function (event, selectedYear) {
        circles
          .classed(
            "is-year-highlighted",
            d => d.year === selectedYear.year
          )
          .classed(
            "is-year-muted",
            d => d.year !== selectedYear.year
          );

        const partialText =
          selectedYear.year === 2026
            ? " · partial year"
            : "";

        yearSummary.text(
          `${selectedYear.year}: ` +
          `${selectedYear.count.toLocaleString()} records` +
          partialText
        );
      }
    )
    .on("mouseleave", function () {
      circles
        .classed("is-year-highlighted", false)
        .classed("is-year-muted", false);

      yearSummary.text(
        `${devices.length.toLocaleString()} FDA list records`
      );
    });
}

function drawClusters(
  layers,
  width,
  height
) {
  const svg =
    layers.annotations;

  const backgroundLayer =
    layers.backgrounds;

  const deviceLayer =
    layers.devices;
  const interactionLayer =
    layers.interactions;

  const highlightedPanels = [
    "Radiology",
    "Cardiovascular",
    "Neurology",
    "Anesthesiology",
    "Gastroenterology-Urology"
  ];

  const getClusterId = function (device) {
    return highlightedPanels.includes(
      device.panel
    )
      ? device.panel
      : "Other panels";
  };

  const definitions = [
    {
      id: "Radiology",
      label: "Radiology",
      x: 0.28,
      y: 0.57
    },
    {
      id: "Cardiovascular",
      label: "Cardiovascular",
      x: 0.68,
      y: 0.29
    },
    {
      id: "Neurology",
      label: "Neurology",
      x: 0.81,
      y: 0.55
    },
    {
      id: "Anesthesiology",
      label: "Anesthesiology",
      x: 0.61,
      y: 0.79
    },
    {
      id: "Gastroenterology-Urology",
      label: "GI / Urology",
      x: 0.82,
      y: 0.80
    },
    {
      id: "Other panels",
      label: "Other panels",
      x: 0.52,
      y: 0.15
    }
  ];

  const grouped = d3.group(
    devices,
    getClusterId
  );

  const nodeRadius = 2.2;
  const clusterData = [];

  const summaries =
    definitions.map(function (definition) {
      const members =
        (
          grouped.get(
            definition.id
          ) ?? []
        ).map(function (device) {
          return {
            ...device,
            clusterId:
              definition.id,
            r: nodeRadius
          };
        });

      if (members.length > 0) {
        d3.packSiblings(members);
      }

      const enclosingCircle =
        members.length > 0
          ? d3.packEnclose(members)
          : { r: 0 };

      const centerX =
        width * definition.x;

      const centerY =
        height * definition.y;

      members.forEach(function (node) {
        node.clusterX =
          centerX + node.x;

        node.clusterY =
          centerY + node.y;

        clusterData.push(node);
      });

      return {
        ...definition,
        centerX,
        centerY,
        radius:
          enclosingCircle.r,
        count:
          members.length,
        percent:
          members.length /
          devices.length *
          100
      };
    });
    const radiologySummary =
      summaries.find(
      summary =>
        summary.id === "Radiology"
    );

    const radiologyHalo = backgroundLayer
      .append("circle")
      .attr("class", "cluster-halo")
      .attr(
        "cx",
        radiologySummary.centerX
      ) 
      .attr(
        "cy",
        radiologySummary.centerY
      )
      .attr(
        "r",
        radiologySummary.radius + 12
      );
  const circles = deviceLayer
    .selectAll(".device-dot")
    .data(
      clusterData,
      d => d.id
    )
    .join(
      enter => enter
        .append("circle")
        .attr(
          "class",
          "device-dot"
        )
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .attr("r", nodeRadius)
        .attr("opacity", 0),

      update => update,

      exit => exit.remove()
    );

  circles
    .classed("is-year-highlighted", false)
    .classed("is-year-muted", false)
    .classed("is-cluster-highlighted", false)
    .classed("is-cluster-muted", false)
    .interrupt("layout")
    .transition("layout")
    .duration(1100)
    .ease(d3.easeCubicInOut)
    .attr(
      "cx",
      d => d.clusterX
    )
    .attr(
      "cy",
      d => d.clusterY
    )
    .attr("r", nodeRadius)
    .attr("opacity", 0.78);

  const clusterSummary = svg
    .append("text")
    .attr("x", 28)
    .attr("y", 30)
    .attr(
      "class",
      "cluster-summary"
    )
    .text(
      `${devices.length.toLocaleString()} records regrouped by medical panel`
    );
   
  interactionLayer
    .selectAll(".cluster-hit-area")
    .data(
      summaries,
      d => d.id
    )
    .join("circle")
    .attr(
      "class",
      "cluster-hit-area"
    )
    .attr(
      "cx",
      d => d.centerX
    )
    .attr(
      "cy",
      d => d.centerY
    )
    .attr(
      "r",
      d => Math.max(
        d.radius + 12,
        20
      )
    )
    .attr(
      "fill",
      "transparent"
    )
    .on(
      "mouseenter",
      function (event, selectedCluster) {
        radiologyHalo.classed(
           "is-muted",
           selectedCluster.id !== "Radiology"
          );
        circles
          .classed(
            "is-cluster-highlighted",
            d =>
              d.clusterId ===
              selectedCluster.id
          )
          .classed(
            "is-cluster-muted",
            d =>
              d.clusterId !==
              selectedCluster.id
          );

        labels
          .classed(
            "is-active",
            d =>
              d.id ===
              selectedCluster.id
          );

        clusterSummary.text(
          `${selectedCluster.label}: ` +
          `${selectedCluster.count.toLocaleString()} records · ` +
          `${selectedCluster.percent.toFixed(1)}%`
        );
      }
    )
  .on(
    "mouseleave",
    function () {
      radiologyHalo.classed(
        "is-muted",
        false
        );
      circles
        .classed(
          "is-cluster-highlighted",
          false
        )
        .classed(
          "is-cluster-muted",
          false
        );

      labels
        .classed(
          "is-active",
          false
        );

      clusterSummary.text(
        `${devices.length.toLocaleString()} records regrouped by medical panel`
      );
    }
  );

  svg
    .append("text")
    .attr("x", 28)
    .attr("y", 49)
    .attr(
      "class",
      "cluster-instruction"
    ) 
    .text(
      "Hover over a cluster to compare its share."
    );

  const labels = svg
    .selectAll(
      ".cluster-label-group"
    )
    .data(summaries)
    .join("g")
    .attr(
      "class",
      "cluster-label-group"
    )
    .attr(
      "transform",
      function (d) {
        const labelY =
          d.centerY -
          d.radius -
          17;

        return (
          `translate(` +
          `${d.centerX},` +
          `${labelY})`
        );
      }
    );

  labels
    .append("text")
    .attr(
      "class",
      "cluster-label"
    )
    .attr(
      "text-anchor",
      "middle"
    )
    .text(d => d.label);

  labels
    .append("text")
    .attr(
      "class",
      "cluster-count"
    )
    .attr("y", 16)
    .attr(
      "text-anchor",
      "middle"
    )
    .text(function (d) {
      return (
        `${d.count.toLocaleString()} · ` +
        `${d.percent.toFixed(1)}%`
      );
    });
}

function wrapSvgText(
  selection,
  content,
  maxWidth,
  lineHeight = 16
) {
  selection.each(function () {
    const text =
      d3.select(this);

    const words =
      content.split(/\s+/);

    const x =
      text.attr("x");

    const y =
      text.attr("y");

    let line = [];
    let lineNumber = 0;

    let tspan = text
      .text(null)
      .append("tspan")
      .attr("x", x)
      .attr("y", y);

    words.forEach(function (word) {
      line.push(word);

      tspan.text(
        line.join(" ")
      );

      if (
        tspan
          .node()
          .getComputedTextLength() >
          maxWidth &&
        line.length > 1
      ) {
        line.pop();

        tspan.text(
          line.join(" ")
        );

        line = [word];
        lineNumber += 1;

        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr(
            "dy",
            `${lineNumber * lineHeight}px`
          )
          .text(word);
      }
    });
  });
}

function drawEvidenceTrail(svg,width,height) {
  const trail = getSelectedTrail();

  if (!trail) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr(
        "text-anchor",
        "middle"
      )
      .text(
        "No evidence trail is available."
      );

    return;
  }


  const margin = {
    left: 66,
    right: 66
  };

  const chainY =
    height * 0.53;

  const xScale = d3
    .scalePoint()
    .domain(
      trail.stages.map(
        stage => stage.id
      )
    )
    .range([
      margin.left,
      width - margin.right
    ])
    .padding(0.25);

  const stageData =
    trail.stages.map(
      function (stage, index) {
        return {
          ...stage,
          index,
          x: xScale(stage.id)
        };
      }
    );

  const linkData =
    d3.pairs(stageData);

  svg
    .append("text")
    .attr(
      "class",
      "trail-case-type"
    )
    .attr("x", 34)
    .attr("y", 38)
    .text(trail.label);

  svg
    .append("text")
    .attr(
      "class",
      "trail-device-title"
    )
    .attr("x", 34)
    .attr("y", 70)
    .text(trail.device);

  svg
    .append("text")
    .attr(
      "class",
      "trail-device-meta"
    )
    .attr("x", 34)
    .attr("y", 94)
    .text(
      trail.company +
      " · " +
      trail.pathway +
      " " +
      trail.submission +
      " · " +
      trail.decisionDate
    );

  svg
    .selectAll(
      ".evidence-link-segment"
    )
    .data(linkData)
    .join("line")
    .attr(
      "class",
      function (pair) {
        return (
          "evidence-link-segment " +
          `is-${pair[1].status}`
        );
      }
    )
    .attr(
      "x1",
      pair => pair[0].x
    )
    .attr(
      "x2",
      pair => pair[1].x
    )
    .attr("y1", chainY)
    .attr("y2", chainY)
    .attr("opacity", 0)
    .transition()
    .duration(500)
    .delay(
      (_, index) =>
        index * 120
    )
    .attr("opacity", 1);

  const stageGroups = svg
    .selectAll(
    ".evidence-stage"
    )
    .data(
      stageData,
      stage => stage.id
    )
    .join("g")
    .attr(
      "class",
      "evidence-stage"
    )
    .classed(
      "is-active",
      stage =>
        stage.id ===
        state.selectedStage
    )
    .attr(
      "transform",
      stage =>
        `translate(${stage.x}, ${chainY})`
    )
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr(
      "aria-label",
      stage =>
        `${stage.label}: ${
          trailStatusLabels[
            stage.status
          ] ?? stage.status
        }`
    )
    .attr("opacity", 0)
    .on(
      "click",
      function (event, stage) {
        state.selectedStage =
          stage.id;

        stageGroups.classed(
          "is-active",
          item =>
            item.id ===
            state.selectedStage
        );

        renderTrailDetail();
      }
    )
    .on(
      "keydown",
      function (event, stage) {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          state.selectedStage =
            stage.id;

          stageGroups.classed(
            "is-active",
            item =>
              item.id ===
              state.selectedStage
          );

          renderTrailDetail();
        }
      }
    );

    stageGroups
      .transition()
      .duration(450)
      .delay(
        (_, index) =>
          index * 120
      )
      .attr("opacity", 1);

    stageGroups
      .append("circle")
      .attr(
        "class",
        stage =>
          `evidence-node is-${stage.status}`
      )
      .attr("r", 18);

    stageGroups
      .append("text")
      .attr(
        "class",
        "evidence-stage-number"
      )
      .attr(
        "text-anchor",
        "middle"
      )
      .attr("dy", "0.35em")
      .attr(
        "fill",
        stage =>
          stage.status ===
          "confirmed"
            ? "white"
            : "#182326"
      )
      .text(
        stage =>
          stage.index + 1
      );

    stageGroups
      .append("text")
      .attr(
        "class",
        "evidence-stage-label"
      )
      .attr("y", 48)
      .attr(
        "text-anchor",
        "middle"
      )
      .text(
        stage => stage.label
      );

    stageGroups
      .append("text")
      .attr(
        "class",
        "evidence-stage-status"
      )
      .attr("y", 68)
      .attr(
        "text-anchor",
        "middle"
      )
      .text(
        stage =>
          trailStatusLabels[
            stage.status
          ] ?? stage.status
      );

    const message = svg
      .append("text")
      .attr(
        "class",
        "trail-message"
      )
      .attr("x", width / 2)
      .attr("y", height - 62)
      .attr(
        "text-anchor",
        "middle"
      );

    wrapSvgText(
      message,
      trail.message,
      Math.min(
        width - 120,
        680
      ),
      17
    );
}

const explorerSpecialtyPanels = [
  "Radiology",
  "Cardiovascular",
  "Neurology",
  "Anesthesiology",
  "Gastroenterology-Urology"
];


function getDecisionPeriod(year) {
  if (year <= 2009) {
    return "1995–2009";
  }

  if (year <= 2015) {
    return "2010–2015";
  }

  if (year <= 2018) {
    return "2016–2018";
  }

  if (year <= 2021) {
    return "2019–2021";
  }

  if (year <= 2024) {
    return "2022–2024";
  }

  return "2025–2026";
}


function getExplorerDefinitions() {
  if (state.explorerGroup === "specialty") {
    return [
      {
        id: "Radiology",
        label: "Radiology"
      },
      {
        id: "Cardiovascular",
        label: "Cardiovascular"
      },
      {
        id: "Neurology",
        label: "Neurology"
      },
      {
        id: "Anesthesiology",
        label: "Anesthesiology"
      },
      {
        id: "Gastroenterology-Urology",
        label: "GI / Urology"
      },
      {
        id: "Other panels",
        label: "Other panels"
      }
    ];
  }

  if (state.explorerGroup === "year") {
    return [
      {
        id: "1995–2009",
        label: "1995–2009"
      },
      {
        id: "2010–2015",
        label: "2010–2015"
      },
      {
        id: "2016–2018",
        label: "2016–2018"
      },
      {
        id: "2019–2021",
        label: "2019–2021"
      },
      {
        id: "2022–2024",
        label: "2022–2024"
      },
      {
        id: "2025–2026",
        label: "2025–2026"
      }
    ];
  }

  return [
    {
      id: "510(k)",
      label: "510(k)"
    },
    {
      id: "De Novo",
      label: "De Novo"
    },
    {
      id: "PMA",
      label: "PMA"
    }
  ];
}


function getExplorerGroupId(device) {
  if (state.explorerGroup === "specialty") {
    return explorerSpecialtyPanels.includes(
      device.panel
    )
      ? device.panel
      : "Other panels";
  }

  if (state.explorerGroup === "year") {
    return getDecisionPeriod(
      device.year
    );
  }

  return device.pathway;
}


function drawExplorer(
  layers,
  width,
  height
) {
  const nodeLayer =
    layers.nodes;

  const annotationLayer =
    layers.annotations;

  const definitions =
    getExplorerDefinitions();

  const auditBySubmission =
    new Map(
      evidenceTrails.map(
        trail => [
          trail.submission,
          trail
        ]
      )
    );

  const grouped = d3.group(
    devices,
    getExplorerGroupId
  );

  const columnCount =
    definitions.length <= 3
      ? definitions.length
      : 3;

  const rowCount =
    Math.ceil(
      definitions.length /
      columnCount
    );

  const xScale = d3
    .scalePoint()
    .domain(
      d3.range(columnCount)
    )
    .range([
      width * 0.2,
      width * 0.8
    ]);

  const yPositions =
    rowCount === 1
      ? [height * 0.56]
      : [
          height * 0.39,
          height * 0.74
        ];

  const explorerNodes = [];

  const summaries =
    definitions.map(
      function (
        definition,
        index
      ) {
        const column =
          index % columnCount;

        const row =
          Math.floor(
            index / columnCount
          );

        const centerX =
          xScale(column);

        const centerY =
          yPositions[row];

        const members =
          (
            grouped.get(
              definition.id
            ) ?? []
          ).map(function (device) {
            const trail =
              auditBySubmission.get(
                device.id
              );

            const studyStage =
              trail?.stages.find(
                stage =>
                  stage.id ===
                  "registered-study"
              );

            const evidenceStatus =
              studyStage?.status ??
              "not-audited";

            const isAudited =
              Boolean(trail);

            let radius = 2.05;
            
            if (isAudited) {
              radius = 
                state.evidenceLayer ===
                  "study"
                  ? 5.8
                  : 4.2;
            }

            return {
              ...device,
              groupId:
                definition.id,
              trail,
              isAudited,
              evidenceStatus,
              r: radius
            };
          });

        if (members.length > 0) {
          d3.packSiblings(members);
        }

        const enclosure =
          members.length > 0
            ? d3.packEnclose(
                members
              )
            : { r: 0 };

        members.forEach(
          function (node) {
            node.explorerX =
              centerX + node.x;

            node.explorerY =
              centerY + node.y;

            explorerNodes.push(
              node
            );
          }
        );

        return {
          ...definition,
          centerX,
          centerY,
          radius: enclosure.r,
          count: members.length,
          percent:
            members.length /
            devices.length *
            100
        };
      }
    );

  annotationLayer
    .append("text")
    .attr(
      "class",
      "explorer-summary"
    )
    .attr("x", 28)
    .attr("y", 30)
    .text(
      `${devices.length.toLocaleString()} FDA list records`
    );

  annotationLayer
    .append("text")
    .attr(
      "class",
      "explorer-instruction"
    )
    .attr("x", 28)
    .attr("y", 50)
    .text(
      state.evidenceLayer ===
        "study"
        ? "Study-trace layer: 3 manually audited records; all others are not audited."
        : "Regulatory layer: every dot is an FDA list record; outlined dots are audited examples."
    );

  const nodes = nodeLayer
    .selectAll(
      ".explorer-node"
    )
    .data(
      explorerNodes,
      device => device.id
    )
    .join(
      enter => enter
        .append("circle")
        .attr(
          "class",
          "explorer-node"
        )
        .attr(
          "cx",
          width / 2
        )
        .attr(
          "cy",
          height / 2
        )
        .attr("r", 0)
        .attr("opacity", 0),

      update => update,

      exit => exit
        .transition()
        .duration(300)
        .attr("r", 0)
        .remove()
    )
    .attr(
      "class",
      function (device) {
        const classes = [
          "explorer-node"
        ];

        if (
          state.evidenceLayer ===
          "regulatory"
        ) {
          classes.push(
            "is-regulatory"
          );
        } else {
          classes.push(
            `is-${device.evidenceStatus}`
          );
        }

        if (device.isAudited) {
          classes.push(
            "is-audited"
          );
        }

        return classes.join(" ");
      }
    )
    .classed(
      "is-selected",
      device =>
        device.id ===
        state.selectedExplorerDevice
    )
    .attr(
      "tabindex",
      device =>
        device.isAudited
          ? 0
          : null
    )
    .attr(
      "role",
      device =>
        device.isAudited
          ? "button"
          : null
    )
    .attr(
      "aria-label",
      function (device) {
        if (!device.isAudited) {
          return null;
        }

        return (
          device.device +
          ": " +
          (
            trailStatusLabels[
              device.evidenceStatus
            ] ??
            device.evidenceStatus
          )
        );
      }
    )
    .on(
      "click",
      function (event, device) {
        if (!device.isAudited) {
          return;
        }

        state.selectedExplorerDevice =
          device.id;

        nodes.classed(
          "is-selected",
          item =>
            item.id ===
            state.selectedExplorerDevice
        );

        renderExplorerDetail();
      }
    )
    .on(
      "keydown",
      function (event, device) {
        if (
          !device.isAudited ||
          (
            event.key !== "Enter" &&
            event.key !== " "
          )
        ) {
          return;
        }

        event.preventDefault();

        state.selectedExplorerDevice =
          device.id;

        nodes.classed(
          "is-selected",
          item =>
            item.id ===
            state.selectedExplorerDevice
        );

        renderExplorerDetail();
      }   
    );

  nodes
    .interrupt(
      "explorer-layout"
    )
    .transition(
      "explorer-layout"
    )
    .duration(950)
    .ease(
      d3.easeCubicInOut
    )
    .attr(
      "cx",
      device =>
        device.explorerX
    )
    .attr(
      "cy",
      device =>
        device.explorerY
    )
    .attr(
      "r",
      device => device.r
    )
    .attr("opacity", 1);

  nodes
    .filter(
      device =>
        device.isAudited
    )
    .selectAll("title")
    .data(
      device => [device]
    )
    .join("title")
    .text(function (device) {
      const layerDetail =
        state.evidenceLayer ===
        "study"
          ? (
              "Registered-study trace: " +
              (
                trailStatusLabels[
                  device.evidenceStatus
                ] ??
                device.evidenceStatus
              )
            )
          : (
              device.pathway +
              " " +
              device.id +
              "\nManually audited case"
            );

      return (
        device.device +
        "\n" +
        device.company +
        "\n" +
        layerDetail
      );
    });

  const labels =
    annotationLayer
      .selectAll(
        ".explorer-group-label"
      )
      .data(
        summaries,
        group => group.id
      )
      .join("g")
      .attr(
        "class",
        "explorer-group-label"
      )
      .attr(
        "transform",
        function (group) {
          return (
            `translate(` +
            `${group.centerX},` +
            `${
              group.centerY -
              group.radius -
              16
            })`
          );
        }
      );

  labels
    .append("text")
    .attr(
      "class",
      "explorer-group-name"
    )
    .attr(
      "text-anchor",
      "middle"
    )
    .text(
      group => group.label
    );

  labels
    .append("text")
    .attr(
      "class",
      "explorer-group-count"
    )
    .attr("y", 15)
    .attr(
      "text-anchor",
      "middle"
    )
    .text(function (group) {
      return (
        `${group.count.toLocaleString()} · ` +
        `${group.percent.toFixed(1)}%`
      );
    });
}

function debounce(callback, wait) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), wait);
  };
}

initialize();
