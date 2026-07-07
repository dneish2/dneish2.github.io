const revealItems = document.querySelectorAll(".reveal");
const navLinks = document.querySelectorAll(".frame-nav-link");
const frames = document.querySelectorAll("[data-nav]");

const state = {
  starterHome: "westlynn",
  selectedHome: "maple",
  budgetRange: "2200-2600",
  parkingPriority: "preferred",
  moveInStart: "6",
  moveInEnd: "8",
  consentChannel: "phone",
  showingDay: "wed",
  showingSlot: "3:00 PM",
  consentDraftDirty: false,
  reviewDraftDirty: false,
  requestSent: false,
};

const starterHomes = {
  westlynn: {
    title: "West Lynn Terrace",
    copy: "An early Clarksville candidate. The shortlist tightens once budget and parking are edited.",
  },
  duval: {
    title: "Duval Courtyard Flat",
    copy: "Parking looks easier here, but the pet details are still thinner than the others.",
  },
  barton: {
    title: "Barton View Studio",
    copy: "The greenbelt access is appealing, but this one gets harder to justify if budget stays tight.",
  },
};

const homes = {
  maple: {
    name: "Maple & Burnet House",
    cityMeta: "Clarksville • Austin",
    heroMeta: "Clarksville • Austin, TX",
    shortlistMeta: "Clarksville • Balcony",
    reviewMeta: "Clarksville • Balcony • $2,320/mo",
    price: "$2,320",
    priceMonthly: "$2,320/mo",
    heroClass: "media-maple",
    badge: "Balcony listing",
    shortlistBadge: "Lead pick",
    scheduleChip: "Balcony home",
    selectedNote: "The only shortlist option with a balcony.",
    headline: "Balcony plus walkability makes this the standout pick.",
    walkScore: "92 / 100",
    petPolicy: "Small dog okay",
    parking: "Street permit",
    fitList: [
      "Most walkable block in the shortlist and the only balcony option.",
      "Dog policy is already verified for the current listing.",
      "Coffee, a corner grocery, and a small park are all within a short walk.",
      "Street permit parking is the main compromise the user is making.",
    ],
    sourceParking: "Street permit note pulled from the listing remarks",
    sourceNearby: "Coffee, grocery, and green space highlighted from local amenity notes",
    shortlistTags: ["Walkable", "Balcony", "Dog okay"],
    currentContentsNote: "Balcony",
    altNote: "Balcony leads the shortlist",
    resolutionNote: "Resolved from “the one with the balcony”",
    resolutionChat:
      "That should be Maple & Burnet House. It's the only shortlist home with a balcony.",
  },
  juniper: {
    name: "Juniper Walk Apartments",
    cityMeta: "Hyde Park • Austin",
    heroMeta: "Hyde Park • Austin, TX",
    shortlistMeta: "Hyde Park • Easier parking",
    reviewMeta: "Hyde Park • Courtyard light • $2,280/mo",
    price: "$2,280",
    priceMonthly: "$2,280/mo",
    heroClass: "media-juniper",
    badge: "Easy parking",
    shortlistBadge: "Parking pick",
    scheduleChip: "Easy parking",
    selectedNote: "The easiest parking option in the shortlist.",
    headline: "Courtyard light and easier parking make this the safer pick.",
    walkScore: "88 / 100",
    petPolicy: "Small dog okay",
    parking: "Off-street lot",
    fitList: [
      "Best fit if parking becomes a stricter requirement.",
      "Small dog policy still works for the current search.",
      "A quieter street and nearby park make it easier to picture day-to-day use.",
      "The main compromise is losing the balcony that made Maple stand out.",
    ],
    sourceParking: "Off-street lot confirmed in the building details",
    sourceNearby: "Park and coffee notes highlighted from neighborhood amenities",
    shortlistTags: ["Easy parking", "Courtyard light", "Dog okay"],
    currentContentsNote: "Better parking",
    altNote: "Parking is easier here",
    resolutionNote: "Resolved from the home currently in focus",
    resolutionChat:
      "That should be Juniper Walk Apartments. It's the shortlist option with easier parking and courtyard light.",
  },
  southlamar: {
    name: "South Lamar Yard",
    cityMeta: "South Lamar • Austin",
    heroMeta: "South Lamar • Austin, TX",
    shortlistMeta: "South Lamar • Best light",
    reviewMeta: "South Lamar • Big windows • $2,485/mo",
    price: "$2,485",
    priceMonthly: "$2,485/mo",
    heroClass: "media-arbor",
    badge: "Best light",
    shortlistBadge: "Light pick",
    scheduleChip: "Brightest option",
    selectedNote: "The brightest option in the shortlist, but less walkable.",
    headline: "Big windows and a newer finish make this the brightest alternative.",
    walkScore: "83 / 100",
    petPolicy: "Small dog okay",
    parking: "Garage add-on",
    fitList: [
      "Strongest natural light in the shortlist and the newest finish package.",
      "Dog policy still fits the current search constraints.",
      "Groceries stay close, but the block itself is less walkable than Maple.",
      "Garage parking is available, but it comes with a price and walkability trade-off.",
    ],
    sourceParking: "Garage add-on pricing pulled from the partner listing feed",
    sourceNearby: "Groceries and neighborhood notes highlighted from local amenity data",
    shortlistTags: ["Best light", "Garage option", "Dog okay"],
    currentContentsNote: "Best natural light",
    altNote: "Best light, less walkable",
    resolutionNote: "Resolved from the home currently in focus",
    resolutionChat:
      "That should be South Lamar Yard. It's the shortlist option with the strongest light and the newer finish.",
  },
};

const consentContent = {
  email: {
    label: "Email",
    scheduleLabel: "Name + email",
    reviewCopy: "Name and email address only.",
    sharedLine: "Name and email address.",
    channelPhrase: "email is the easiest way to reach me.",
  },
  phone: {
    label: "Phone",
    scheduleLabel: "Name + phone",
    reviewCopy: "Name and phone number only.",
    sharedLine: "Name and phone number.",
    channelPhrase: "phone is the easiest way to reach me.",
  },
  both: {
    label: "Email + phone",
    scheduleLabel: "Name + email + phone",
    reviewCopy: "Name, email, and phone.",
    sharedLine: "Name, email, and phone number.",
    channelPhrase: "email or phone both work for me.",
  },
};

const dom = {
  stateButtons: document.querySelectorAll("[data-state-key]"),
  starterCards: document.querySelectorAll(".home-card-start"),
  resultCards: document.querySelectorAll(".home-card-results"),
  shortlistCards: document.querySelectorAll(".home-card-shortlist"),
  startBudgetValue: document.getElementById("start-budget-value"),
  startMoveinValue: document.getElementById("start-movein-value"),
  startParkingValue: document.getElementById("start-parking-value"),
  starterRecapBudget: document.getElementById("starter-recap-budget"),
  moveInStart: document.getElementById("move-in-start-input"),
  moveInEnd: document.getElementById("move-in-end-input"),
  consentDraft: document.getElementById("consent-note-draft"),
  reviewDraft: document.getElementById("review-message-draft"),
  starterPreviewTitle: document.getElementById("starter-preview-title"),
  starterPreviewCopy: document.getElementById("starter-preview-copy"),
  editBudgetChip: document.getElementById("edit-budget-chip"),
  editParkingChip: document.getElementById("edit-parking-chip"),
  tradeoffPill: document.getElementById("tradeoff-pill"),
  tradeoffTitle: document.getElementById("tradeoff-title"),
  tradeoffCopy: document.getElementById("tradeoff-copy"),
  resultsBudget: document.getElementById("results-budget"),
  resultsMovein: document.getElementById("results-movein"),
  resultsParking: document.getElementById("results-parking"),
  resultsParkingPill: document.getElementById("results-parking-pill"),
  detailFilterBudget: document.getElementById("detail-filter-budget"),
  detailFilterMovein: document.getElementById("detail-filter-movein"),
  detailFilterParking: document.getElementById("detail-filter-parking"),
  detailSelectedHome: document.getElementById("detail-selected-home"),
  detailSelectedNote: document.getElementById("detail-selected-note"),
  detailHero: document.getElementById("detail-hero"),
  detailHeroBadge: document.getElementById("detail-hero-badge"),
  detailHeroTitle: document.getElementById("detail-hero-title"),
  detailHeroSubtitle: document.getElementById("detail-hero-subtitle"),
  detailHeadline: document.getElementById("detail-headline"),
  detailRent: document.getElementById("detail-rent"),
  detailWalkScore: document.getElementById("detail-walk-score"),
  detailPetPolicy: document.getElementById("detail-pet-policy"),
  detailParkingValue: document.getElementById("detail-parking-value"),
  detailFitList: document.getElementById("detail-fit-list"),
  detailSourceParking: document.getElementById("detail-source-parking"),
  detailSourceNearby: document.getElementById("detail-source-nearby"),
  shortlistBudget: document.getElementById("shortlist-budget"),
  shortlistMovein: document.getElementById("shortlist-movein"),
  shortlistParking: document.getElementById("shortlist-parking"),
  shortlistCurrentContents: document.getElementById("shortlist-current-contents"),
  shortlistLeadCard: document.getElementById("shortlist-lead-card"),
  shortlistLeadMedia: document.getElementById("shortlist-lead-media"),
  shortlistLeadBadge: document.getElementById("shortlist-lead-badge"),
  shortlistLeadName: document.getElementById("shortlist-lead-name"),
  shortlistLeadMeta: document.getElementById("shortlist-lead-meta"),
  shortlistLeadPrice: document.getElementById("shortlist-lead-price"),
  shortlistLeadTags: document.getElementById("shortlist-lead-tags"),
  shortlistAltList: document.getElementById("shortlist-alt-list"),
  resolvedListingName: document.getElementById("resolved-listing-name"),
  resolvedListingNote: document.getElementById("resolved-listing-note"),
  consentAssistantResolution: document.getElementById("consent-assistant-resolution"),
  shareHeading: document.getElementById("share-heading"),
  shareItem1: document.getElementById("share-item-1"),
  shareItem2: document.getElementById("share-item-2"),
  shareItem3: document.getElementById("share-item-3"),
  scheduleHomeTitle: document.getElementById("schedule-home-title"),
  scheduleHomeChip: document.getElementById("schedule-home-chip"),
  scheduleContactMethod: document.getElementById("schedule-contact-method"),
  scheduleSelectedSlot: document.getElementById("schedule-selected-slot"),
  reviewConsentStep: document.getElementById("review-consent-step"),
  reviewTimeStep: document.getElementById("review-time-step"),
  reviewHeadline: document.getElementById("review-headline"),
  reviewPropertyName: document.getElementById("review-property-name"),
  reviewPropertyMeta: document.getElementById("review-property-meta"),
  reviewContactChannel: document.getElementById("review-contact-channel"),
  reviewContactCopy: document.getElementById("review-contact-copy"),
  reviewSelectedTime: document.getElementById("review-selected-time"),
  reviewShared1: document.getElementById("review-shared-1"),
  reviewShared2: document.getElementById("review-shared-2"),
  reviewShared3: document.getElementById("review-shared-3"),
  reviewStatusChip: document.getElementById("review-status-chip"),
  reviewStatusMeta: document.getElementById("review-status-meta"),
  reviewStatusNote: document.getElementById("review-status-note"),
  reviewDraftContent: document.getElementById("review-draft-content"),
  reviewSentContent: document.getElementById("review-sent-content"),
  reviewSendButton: document.getElementById("review-send-button"),
  reviewBackButton: document.getElementById("review-back-button"),
  reviewSentHome: document.getElementById("review-sent-home"),
  reviewSentTime: document.getElementById("review-sent-time"),
  reviewSentChannel: document.getElementById("review-sent-channel"),
  reviewSentSummary: document.getElementById("review-sent-summary"),
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach((item) => revealObserver.observe(item));

const navObserver = new IntersectionObserver(
  (entries) => {
    const visibleEntry = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visibleEntry) {
      return;
    }

    const activeId = visibleEntry.target.getAttribute("data-nav");

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("active", isActive);
    });
  },
  {
    rootMargin: "-22% 0px -55% 0px",
    threshold: [0.08, 0.2, 0.35, 0.55],
  }
);

frames.forEach((frame) => navObserver.observe(frame));

const budgetLabels = {
  "1800-2200": "$1,800 to $2,200",
  "2200-2600": "$2,200 to $2,600",
  "2600-plus": "$2,600 plus",
};

function formatMoveIn() {
  return `${state.moveInStart} to ${state.moveInEnd} weeks`;
}

function formatParking(long = false) {
  const map = {
    required: long ? "Required" : "Parking required",
    preferred: long ? "Preferred, not required" : "Parking flexible",
    "not-important": long ? "Not important" : "Parking relaxed",
  };
  return map[state.parkingPriority];
}

function formatScheduleFull() {
  const day = state.showingDay === "wed" ? "Wednesday, June 5" : "Thursday, June 6";
  return `${day} at ${state.showingSlot}`;
}

function formatScheduleShort() {
  const day = state.showingDay === "wed" ? "Wed Jun 5" : "Thu Jun 6";
  return `${day} • ${state.showingSlot}`;
}

function generateConsentDraft(home, consent) {
  return `Hi Maya, I'm interested in ${home.name}. Afternoons are best for me, and ${consent.channelPhrase}`;
}

function generateReviewDraft(home, consent) {
  return `Hi Maya, I'd like to request a tour for ${home.name} on ${formatScheduleFull()}. ${consent.channelPhrase[0].toUpperCase()}${consent.channelPhrase.slice(1)}`;
}

function getTradeoffSnapshot() {
  if (state.parkingPriority === "required" && state.budgetRange === "1800-2200") {
    return {
      pill: "Most selective",
      title: "This pushes the search toward safer parking over charm.",
      copy: "The shortlist likely drops the balcony lead and leans harder on Juniper-style options that are easier to park in.",
    };
  }

  if (state.parkingPriority === "required") {
    return {
      pill: "Parking first",
      title: "This makes the shortlist calmer, but less special.",
      copy: "Requiring parking preserves fewer walkable standouts and makes the easier-lot options feel safer than the balcony pick.",
    };
  }

  if (state.parkingPriority === "not-important") {
    return {
      pill: "Walkability up",
      title: "Relaxing parking unlocks the strongest blocks.",
      copy: "The shortlist can keep the balcony lead and lean harder into coffee, grocery, and park access without treating parking as a blocker.",
    };
  }

  if (state.budgetRange === "2600-plus") {
    return {
      pill: "More room",
      title: "The budget opens better tradeoff coverage.",
      copy: "At the upper range, the assistant can keep Maple in play while still holding onto brighter or easier-parking alternatives nearby.",
    };
  }

  if (state.budgetRange === "1800-2200") {
    return {
      pill: "Budget tight",
      title: "The shortlist gets leaner around this range.",
      copy: "You still keep walkable candidates, but the assistant has less room to preserve balcony and parking at the same time.",
    };
  }

  return {
    pill: "Balanced",
    title: "This is the strongest middle ground.",
    copy: "The shortlist keeps the balcony option while still surfacing easier-parking alternatives to compare.",
  };
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setHtml(element, html) {
  if (element) {
    element.innerHTML = html;
  }
}

function markRequestDirty() {
  state.requestSent = false;
}

function updateSelectedButtons() {
  dom.stateButtons.forEach((button) => {
    const { stateKey, stateValue } = button.dataset;
    const isSelected = state[stateKey] === stateValue;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function updateStarterPreview() {
  const starter = starterHomes[state.starterHome];
  if (!starter) {
    return;
  }

  setText(dom.starterPreviewTitle, starter.title);
  setText(dom.starterPreviewCopy, starter.copy);

  dom.starterCards.forEach((card) => {
    const isSelected = card.dataset.starterHome === state.starterHome;
    card.classList.toggle("is-selected", isSelected);
  });
}

function updateCriteriaSummary() {
  setText(dom.editBudgetChip, state.budgetRange === "1800-2200" ? "Budget narrowed" : "Budget edited");
  setText(
    dom.editParkingChip,
    state.parkingPriority === "required" ? "Parking tightened" : "Parking edited"
  );

  setText(dom.startBudgetValue, budgetLabels[state.budgetRange]);
  setText(dom.startMoveinValue, formatMoveIn());
  setText(dom.startParkingValue, formatParking(true));
  setText(dom.starterRecapBudget, `Budget is now grounded in a ${budgetLabels[state.budgetRange]} range.`);

  setText(dom.resultsBudget, budgetLabels[state.budgetRange]);
  setText(dom.resultsMovein, formatMoveIn());
  setText(dom.resultsParking, formatParking(true));
  setText(dom.resultsParkingPill, formatParking(false));

  setText(dom.detailFilterBudget, budgetLabels[state.budgetRange]);
  setText(dom.detailFilterMovein, formatMoveIn());
  setText(dom.detailFilterParking, formatParking(false));

  setText(dom.shortlistBudget, budgetLabels[state.budgetRange]);
  setText(dom.shortlistMovein, formatMoveIn());
  setText(dom.shortlistParking, formatParking(false));

  const tradeoff = getTradeoffSnapshot();
  setText(dom.tradeoffPill, tradeoff.pill);
  setText(dom.tradeoffTitle, tradeoff.title);
  setText(dom.tradeoffCopy, tradeoff.copy);
}

function updateSelectedHome() {
  const home = homes[state.selectedHome];
  if (!home) {
    return;
  }

  dom.resultCards.forEach((card) => {
    const isSelected = card.dataset.homeId === state.selectedHome;
    card.classList.toggle("is-selected", isSelected);
  });

  dom.shortlistCards.forEach((card) => {
    const isSelected = card.dataset.homeId === state.selectedHome;
    card.classList.toggle("is-selected", isSelected);
  });

  setText(dom.detailSelectedHome, home.name);
  setText(dom.detailSelectedNote, home.selectedNote);
  setText(dom.detailHeroBadge, home.badge);
  setText(dom.detailHeroTitle, home.name);
  setText(dom.detailHeroSubtitle, home.heroMeta);
  setText(dom.detailHeadline, home.headline);
  setText(dom.detailRent, home.priceMonthly);
  setText(dom.detailWalkScore, home.walkScore);
  setText(dom.detailPetPolicy, home.petPolicy);
  setText(dom.detailParkingValue, home.parking);
  setText(dom.detailSourceParking, home.sourceParking);
  setText(dom.detailSourceNearby, home.sourceNearby);

  dom.detailHero.classList.remove("media-maple", "media-juniper", "media-arbor");
  dom.detailHero.classList.add(home.heroClass);

  setHtml(dom.detailFitList, home.fitList.map((item) => `<li>${item}</li>`).join(""));

  setHtml(
    dom.shortlistCurrentContents,
    Object.values(homes)
      .map(
        (item) => `
          <div class="mini-home home-card-shortlist${item.name === home.name ? " is-selected" : ""}" data-home-id="${Object.keys(homes).find((key) => homes[key] === item)}" role="button" tabindex="0">
            <strong>${item.name}</strong>
            <span>${item.currentContentsNote}</span>
          </div>
        `
      )
      .join("")
  );

  dom.shortlistLeadMedia.classList.remove("media-maple", "media-juniper", "media-arbor");
  dom.shortlistLeadMedia.classList.add(home.heroClass);
  setText(dom.shortlistLeadBadge, home.shortlistBadge);
  setText(dom.shortlistLeadName, home.name);
  setText(dom.shortlistLeadMeta, home.shortlistMeta);
  setText(dom.shortlistLeadPrice, home.price);
  setHtml(dom.shortlistLeadTags, home.shortlistTags.map((tag) => `<span>${tag}</span>`).join(""));

  const alternatives = Object.values(homes).filter((item) => item.name !== home.name);
  setHtml(
    dom.shortlistAltList,
    alternatives
      .map(
        (item) => `
          <div class="mini-home home-card-shortlist" data-home-id="${Object.keys(homes).find((key) => homes[key] === item)}" role="button" tabindex="0">
            <strong>${item.name}</strong>
            <span>${item.altNote}</span>
          </div>
        `
      )
      .join("")
  );

  setText(dom.resolvedListingName, home.name);
  setText(dom.resolvedListingNote, home.resolutionNote);
  setText(dom.consentAssistantResolution, home.resolutionChat);
  setText(dom.scheduleHomeTitle, home.name);
  setText(dom.scheduleHomeChip, home.scheduleChip);
  setText(dom.reviewHeadline, `Tour request for ${home.name}`);
  setText(dom.reviewPropertyName, home.name);
  setText(dom.reviewPropertyMeta, home.reviewMeta);
  setText(dom.shareItem2, `${home.name} as the requested listing.`);
  setText(dom.reviewShared2, `${home.name} as the selected listing.`);
  setText(dom.reviewSentHome, home.name);

  attachShortlistCardHandlers();
}

function updateConsentAndSchedule() {
  const consent = consentContent[state.consentChannel];
  const home = homes[state.selectedHome];

  setText(dom.shareHeading, consent.label);
  setText(dom.shareItem1, consent.sharedLine);
  setText(dom.shareItem3, "Preferred afternoon showing times.");
  setText(dom.scheduleContactMethod, consent.scheduleLabel);
  setText(dom.reviewConsentStep, consent.label);
  setText(dom.reviewContactChannel, consent.label);
  setText(dom.reviewContactCopy, consent.reviewCopy);
  setText(dom.reviewShared1, consent.sharedLine);

  setText(dom.scheduleSelectedSlot, formatScheduleFull());
  setText(dom.reviewTimeStep, formatScheduleShort());
  setText(dom.reviewSelectedTime, formatScheduleFull());
  setText(dom.reviewShared3, `Preferred afternoon slot and the current move-in window (${formatMoveIn()}).`);
  setText(dom.reviewSentTime, formatScheduleFull());
  setText(dom.reviewSentChannel, consent.label);
  setText(dom.reviewSentSummary, consent.reviewCopy);

  if (!state.consentDraftDirty) {
    dom.consentDraft.textContent = generateConsentDraft(home, consent);
  }

  if (!state.reviewDraftDirty) {
    dom.reviewDraft.textContent = generateReviewDraft(home, consent);
  }
}

function updateReviewState() {
  const sent = state.requestSent;
  dom.reviewDraftContent.classList.toggle("is-hidden", sent);
  dom.reviewSentContent.classList.toggle("is-hidden", !sent);
  setText(dom.reviewStatusChip, sent ? "Sent to Maya" : "Ready to send");
  setText(dom.reviewStatusMeta, sent ? "You can still go back and edit" : "Verified agent");
  setText(
    dom.reviewStatusNote,
    sent ? "The request was sent with the exact preview shown here." : "Editable until the request is sent."
  );
}

function updateUI() {
  updateSelectedButtons();
  updateStarterPreview();
  updateCriteriaSummary();
  updateSelectedHome();
  updateConsentAndSchedule();
  updateReviewState();
}

function sanitizeWeekInput(node, fallback) {
  const digits = (node.textContent || "").replace(/\D+/g, "");
  const normalized = digits ? String(Math.min(52, Math.max(1, Number(digits)))) : fallback;
  node.textContent = normalized;
  return normalized;
}

function attachShortlistCardHandlers() {
  document.querySelectorAll(".home-card-shortlist").forEach((card) => {
    if (card.dataset.bound === "true") {
      return;
    }

    card.dataset.bound = "true";
    const activate = () => {
      const { homeId } = card.dataset;
    if (!homeId || !homes[homeId]) {
      return;
    }

    markRequestDirty();
    state.selectedHome = homeId;
    updateUI();
  };

    card.addEventListener("click", activate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

dom.stateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const { stateKey, stateValue } = button.dataset;
    if (!stateKey || !stateValue || state[stateKey] === stateValue) {
      return;
    }

    markRequestDirty();
    state[stateKey] = stateValue;
    updateUI();
  });
});

dom.starterCards.forEach((card) => {
  const activate = () => {
    const { starterHome } = card.dataset;
    if (!starterHome || starterHome === state.starterHome) {
      return;
    }

    markRequestDirty();
    state.starterHome = starterHome;
    updateUI();
  };

  card.addEventListener("click", activate);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
});

dom.resultCards.forEach((card) => {
  const activate = () => {
    const { homeId } = card.dataset;
    if (!homeId || homeId === state.selectedHome) {
      return;
    }

    markRequestDirty();
    state.selectedHome = homeId;
    updateUI();
  };

  card.addEventListener("click", activate);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
});

document.querySelectorAll("a[data-home-id]").forEach((link) => {
  link.addEventListener("click", () => {
    const { homeId } = link.dataset;
    if (homeId && homes[homeId]) {
      markRequestDirty();
      state.selectedHome = homeId;
      updateUI();
    }
  });
});

if (dom.moveInStart && dom.moveInEnd) {
  const syncMoveIn = () => {
    markRequestDirty();
    state.moveInStart = sanitizeWeekInput(dom.moveInStart, state.moveInStart);
    state.moveInEnd = sanitizeWeekInput(dom.moveInEnd, state.moveInEnd);
    updateUI();
  };

  ["blur", "input"].forEach((eventName) => {
    dom.moveInStart.addEventListener(eventName, syncMoveIn);
    dom.moveInEnd.addEventListener(eventName, syncMoveIn);
  });
}

if (dom.consentDraft) {
  dom.consentDraft.addEventListener("input", () => {
    state.consentDraftDirty = true;
    markRequestDirty();
  });
}

if (dom.reviewDraft) {
  dom.reviewDraft.addEventListener("input", () => {
    state.reviewDraftDirty = true;
    markRequestDirty();
  });
}

if (dom.reviewSendButton) {
  dom.reviewSendButton.addEventListener("click", () => {
    state.requestSent = true;
    updateUI();
  });
}

if (dom.reviewBackButton) {
  dom.reviewBackButton.addEventListener("click", () => {
    state.requestSent = false;
    updateUI();
  });
}

updateUI();
