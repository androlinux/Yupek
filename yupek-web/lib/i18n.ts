export type Locale = "en" | "nl";

export interface Translations {
  common: {
    freeShippingNotice: string;
    complimentaryShipping: string;
    allRightsReserved: string;
    quickAdd: string;
    close: string;
    back: string;
    save: string;
    cancel: string;
    loading: string;
    error: string;
    success: string;
  };
  nav: {
    shop: string;
    collections: string;
    journal: string;
    about: string;
    contact: string;
    lookbook: string;
    wishlist: string;
    account: string;
    signIn: string;
    signOut: string;
    admin: string;
    search: string;
    bag: string;
  };
  announcement: {
    text: string;
    badge: string;
  };
  hero: {
    heritageTag: string;
    title: string;
    tagline1: string;
    tagline2: string;
    description: string;
    shopBtn: string;
    discoverBtn: string;
    mute: string;
    unmute: string;
    play: string;
    pause: string;
  };
  manifesto: {
    tag: string;
    title: string;
    body1: string;
    body2: string;
  };
  home: {
    newArrivals: string;
    newArrivalsSub: string;
    exploreNewArrivals: string;
    editorialTag: string;
    editorialTitle: string;
    editorialDesc: string;
    editorialBtn: string;
    madeForEveryday: string;
    madeForEverydaySub: string;
    heritageTag: string;
    heritageTitle: string;
    heritageDesc1: string;
    heritageDesc2: string;
    ourStoryBtn: string;
    visitShowroomBtn: string;
    visualLookbook: string;
    visualLookbookSub: string;
    viewLookbookBtn: string;
    look1Caption: string;
    look2Caption: string;
    look3Caption: string;
  };
  shop: {
    title: string;
    subtitle: string;
    filter: string;
    piecesCount: string;
    sort: string;
    category: string;
    size: string;
    color: string;
    price: string;
    upTo: string;
    clearAll: string;
    noResults: string;
    sortFeatured: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    categories: Record<string, string>;
  };
  product: {
    breadcrumbShop: string;
    addToBag: string;
    buyNow: string;
    sizeGuide: string;
    sizePrompt: string;
    selectSizeError: string;
    descriptionTitle: string;
    materialTitle: string;
    shippingTitle: string;
    shippingBody: string;
    colorLabel: string;
    sizeLabel: string;
    sizeGuideCaption: string;
    chest: string;
    length: string;
  };
  cart: {
    title: string;
    emptyTitle: string;
    emptySubtitle: string;
    continueShopping: string;
    subtotal: string;
    taxesNote: string;
    viewBag: string;
    checkout: string;
    addMoreForFreeShipping: string;
    freeShippingUnlocked: string;
    remove: string;
    itemsCount: string;
  };
  checkout: {
    title: string;
    tag: string;
    clientContact: string;
    emailPlaceholder: string;
    deliveryDestination: string;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    postalCode: string;
    phone: string;
    shippingMethod: string;
    standardCourier: string;
    standardNote: string;
    expressCourier: string;
    expressNote: string;
    complimentary: string;
    paymentMethod: string;
    creditCard: string;
    ideal: string;
    applePay: string;
    securityNote: string;
    placeOrder: string;
    processingOrder: string;
    orderSummary: string;
    inclVat: string;
    estimatedTotal: string;
    orderConfirmed: string;
    thankYou: string;
    confirmationDispatched: string;
    viewInAccount: string;
    continueBrowsing: string;
  };
  account: {
    portalTag: string;
    clientAccess: string;
    signInPrompt: string;
    continueGoogle: string;
    continueApple: string;
    signInEmail: string;
    demoSession: string;
    vipClientDemo: string;
    adminDemo: string;
    vipMemberTag: string;
    adminMemberTag: string;
    signedVia: string;
    adminPanelBtn: string;
    signOutBtn: string;
    ordersTab: string;
    wishlistTab: string;
    addressTab: string;
    conciergeTab: string;
    noOrdersTitle: string;
    noOrdersSubtitle: string;
    exploreBtn: string;
    orderNumber: string;
    placedOn: string;
    trackingLabel: string;
    downloadInvoice: string;
    emptyArchiveTitle: string;
    emptyArchiveSubtitle: string;
    discoverPiecesBtn: string;
    primaryAddressTitle: string;
    editDetails: string;
    addressUpdated: string;
    contactPhoneLabel: string;
    saveChanges: string;
    cancelBtn: string;
    conciergeTag: string;
    conciergeTitle: string;
    conciergeDesc: string;
    whatsAppConciergeBtn: string;
    bookAppointmentBtn: string;
  };
  auth: {
    atelierTag: string;
    clientAccessTitle: string;
    createAccountTitle: string;
    subtitle: string;
    continueGoogle: string;
    continueApple: string;
    orViaEmail: string;
    signInTab: string;
    registerTab: string;
    fullNameLabel: string;
    emailLabel: string;
    passwordLabel: string;
    authenticating: string;
    enterAtelierBtn: string;
    createProfileBtn: string;
    instantPreview: string;
    vipDemoBtn: string;
    adminDemoBtn: string;
  };
  contact: {
    tag: string;
    title: string;
    subtitle: string;
    formTitle: string;
    formSubtitle: string;
    fullName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    transmitting: string;
    sendInquiryBtn: string;
    thankYouTitle: string;
    thankYouDesc: string;
    sendAnother: string;
    headquartersTag: string;
    studioTitle: string;
    conciergeEmail: string;
    telephoneLine: string;
    visitingHours: string;
    directWhatsAppBtn: string;
    atelierTour: string;
    subjects: {
      appointment: string;
      garments: string;
      order: string;
      press: string;
      wholesale: string;
    };
  };
  about: {
    manifestoTag: string;
    title: string;
    bornMeeting: string;
    bornBody: string;
    taglineBanner: string;
    craftFilm: string;
    experienceCapsule: string;
    experienceSubtitle: string;
    shopCollectionBtn: string;
    visitAtelierBtn: string;
    blocks: Array<{ title: string; desc: string }>;
  };
  lookbook: {
    tag: string;
    title: string;
    subtitle: string;
    chapter: string;
    shopThisLook: string;
    chapters: Array<{ title: string; subtitle: string }>;
  };
  journal: {
    tag: string;
    title: string;
    subtitle: string;
    readEssay: string;
    posts: Array<{ title: string; desc: string; category: string; date: string }>;
  };
  footer: {
    citySummary: string;
    followYupek: string;
    privacyPolicy: string;
    termsOfService: string;
    complimentaryShipping: string;
    returns30Days: string;
  };
  whatsapp: {
    tooltip: string;
    ariaLabel: string;
  };
  newsletter: {
    tag: string;
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    subscribeBtn: string;
    thankYou: string;
    privacyNote: string;
  };
  searchOverlay: {
    title: string;
    placeholder: string;
    noResults: string;
    closeAria: string;
  };
}

export const dictionaries: Record<Locale, Translations> = {
  en: {
    common: {
      freeShippingNotice: "Complimentary shipping across Europe on orders over €100",
      complimentaryShipping: "Complimentary Shipping",
      allRightsReserved: "ALL RIGHTS RESERVED",
      quickAdd: "QUICK ADD",
      close: "Close",
      back: "Back",
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      error: "An error occurred",
      success: "Saved successfully",
    },
    nav: {
      shop: "SHOP",
      collections: "COLLECTIONS",
      journal: "JOURNAL",
      about: "ABOUT ATELIER",
      contact: "CONTACT",
      lookbook: "LOOKBOOK",
      wishlist: "WISHLIST",
      account: "ACCOUNT",
      signIn: "SIGN IN / REGISTER",
      signOut: "Sign Out",
      admin: "Admin Panel",
      search: "Search",
      bag: "Bag",
    },
    announcement: {
      text: "COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100 — PRIVATE ATELIER VIEWINGS AVAILABLE",
      badge: "SPRING CAPSULE",
    },
    hero: {
      heritageTag: "CENTRAL ASIAN HERITAGE • EUROPEAN TAILORING",
      title: "YUPEK",
      tagline1: "EASTERN ROOTS",
      tagline2: "EUROPEAN FORM",
      description: "Contemporary clothing inspired by ancient Turkmen silk heritage, tailored for modern European living.",
      shopBtn: "SHOP COLLECTION",
      discoverBtn: "DISCOVER YUPEK",
      mute: "Mute",
      unmute: "Unmute",
      play: "Play",
      pause: "Pause",
    },
    manifesto: {
      tag: "PHILOSOPHY",
      title: "EASTERN ROOTS.\nEUROPEAN FORM.",
      body1: "YUPEK translates the intricate geometric language and textile memory of the Silk Road into an understated, architectural wardrobe tailored for life across European metropolises.",
      body2: "Natural plant-dyed fibres, heavyweight organic textiles, and generational craft—shaped with modern restraint.",
    },
    home: {
      newArrivals: "NEW ARRIVALS",
      newArrivalsSub: "HERITAGE, REIMAGINED FOR 2026.",
      exploreNewArrivals: "EXPLORE ALL NEW ARRIVALS",
      editorialTag: "COLLECTION 01 — THE WEAVE",
      editorialTitle: "SILK ROAD ARCHITECTURE",
      editorialDesc: "Rich historical craft meets clean architectural tailoring. Heavyweight organic cottons, natural plant-dyed hues and silk-touch drape engineered for longevity.",
      editorialBtn: "EXPLORE THE LOOKBOOK",
      madeForEveryday: "MADE FOR EVERYDAY",
      madeForEverydaySub: "PERPETUAL WARDROBE PIECES",
      heritageTag: "ORIGINS & ARCHIVE",
      heritageTitle: "FROM HERITAGE\nTO EVERYDAY.",
      heritageDesc1: "YUPEK draws from a visual language shaped by silk, woven textiles, traditional geometric patterns and generations of craftsmanship.",
      heritageDesc2: "Rather than reproducing heritage literally, we reinterpret it. The result is clothing that carries a sense of origin while belonging naturally in modern Europe.",
      ourStoryBtn: "OUR ATELIER STORY",
      visitShowroomBtn: "VISIT SHOWROOM",
      visualLookbook: "VISUAL LOOKBOOK",
      visualLookbookSub: "SPRING / SUMMER 2026 CAPSULE",
      viewLookbookBtn: "VIEW FULL LOOKBOOK",
      look1Caption: "Look 01 • Turkmen Heritage Tee & Denim",
      look2Caption: "Look 02 • Geometric Silk Camp Shirt",
      look3Caption: "Look 03 • Heavyweight Brushed Fleece",
    },
    shop: {
      title: "SHOP",
      subtitle: "Contemporary pieces inspired by Eastern heritage.",
      filter: "FILTER",
      piecesCount: "PIECES IN ATELIER",
      sort: "SORT",
      category: "CATEGORY",
      size: "SIZE",
      color: "COLOR",
      price: "PRICE",
      upTo: "UP TO",
      clearAll: "CLEAR ALL FILTERS",
      noResults: "NO PIECES MATCH THESE FILTERS.",
      sortFeatured: "FEATURED",
      sortNewest: "NEWEST",
      sortPriceAsc: "PRICE LOW TO HIGH",
      sortPriceDesc: "PRICE HIGH TO LOW",
      categories: {
        men: "MEN",
        women: "WOMEN",
        unisex: "UNISEX",
        tees: "TEES",
        shirts: "SHIRTS",
        sweatshirts: "SWEATSHIRTS",
        trousers: "TROUSERS",
        denim: "DENIM",
        accessories: "ACCESSORIES",
        new: "NEW ARRIVALS",
      },
    },
    product: {
      breadcrumbShop: "SHOP",
      addToBag: "ADD TO BAG",
      buyNow: "BUY NOW",
      sizeGuide: "SIZE GUIDE",
      sizePrompt: "SIZE",
      selectSizeError: "Please select a size.",
      descriptionTitle: "DESCRIPTION",
      materialTitle: "MATERIAL & CARE",
      shippingTitle: "SHIPPING & RETURNS",
      shippingBody: "Complimentary standard delivery on orders over €100 across Europe. Expedited courier available at checkout. 30-day complimentary returns.",
      colorLabel: "COLOR",
      sizeLabel: "SIZE",
      sizeGuideCaption: "Size guide, chest in cm",
      chest: "CHEST",
      length: "LENGTH",
    },
    cart: {
      title: "BAG",
      emptyTitle: "YOUR BAG IS EMPTY.",
      emptySubtitle: "Discover timeless silhouettes inspired by Central Asian silk heritage.",
      continueShopping: "CONTINUE SHOPPING",
      subtotal: "SUBTOTAL",
      taxesNote: "Taxes calculated at checkout. Free 30-day EU returns.",
      viewBag: "VIEW BAG",
      checkout: "CHECKOUT",
      addMoreForFreeShipping: "Add {amount} for complimentary shipping",
      freeShippingUnlocked: "Complimentary EU Shipping Unlocked",
      remove: "Remove",
      itemsCount: "items",
    },
    checkout: {
      title: "CHECKOUT",
      tag: "ATELIER DISPATCH",
      clientContact: "01 • CLIENT CONTACT",
      emailPlaceholder: "CLIENT EMAIL ADDRESS",
      deliveryDestination: "02 • DELIVERY DESTINATION",
      firstName: "FIRST NAME",
      lastName: "LAST NAME",
      street: "STREET & NUMBER",
      city: "CITY",
      postalCode: "POSTAL CODE",
      phone: "COURIER TELEPHONE (+31 ...)",
      shippingMethod: "03 • SHIPPING METHOD",
      standardCourier: "STANDARD COURIER DELIVERY",
      standardNote: "3–5 working days (PostNL / DHL)",
      expressCourier: "EXPRESS PRIORITY ATELIER DISPATCH",
      expressNote: "1–2 working days (DHL Express)",
      complimentary: "COMPLIMENTARY",
      paymentMethod: "04 • PAYMENT METHOD",
      creditCard: "Credit Card",
      ideal: "iDEAL / SEPA",
      applePay: "Apple Pay",
      securityNote: "Encrypted with 256-bit TLS security. Immediate dispatch from Central European fulfillment.",
      placeOrder: "PLACE ORDER",
      processingOrder: "PROCESSING ATELIER ORDER...",
      orderSummary: "ORDER SUMMARY",
      inclVat: "INCL. 21% VAT",
      estimatedTotal: "ESTIMATED TOTAL",
      orderConfirmed: "ORDER CONFIRMED",
      thankYou: "THANK YOU FOR YOUR PATRONAGE",
      confirmationDispatched: "Your order has been transmitted to our Amsterdam atelier. A confirmation receipt has been dispatched to your email.",
      viewInAccount: "VIEW IN MY ACCOUNT",
      continueBrowsing: "CONTINUE BROWSING",
    },
    account: {
      portalTag: "ATELIER PORTAL",
      clientAccess: "CLIENT ACCESS",
      signInPrompt: "Sign in with your Google, Apple, or Atelier account to track order dispatches, manage your delivery addresses, and view private collections.",
      continueGoogle: "CONTINUE WITH GOOGLE",
      continueApple: "CONTINUE WITH APPLE",
      signInEmail: "SIGN IN WITH EMAIL",
      demoSession: "Instant Demo Session",
      vipClientDemo: "Log In As VIP Client",
      adminDemo: "Log In As Admin",
      vipMemberTag: "Atelier Circle VIP",
      adminMemberTag: "Master Atelier Admin",
      signedVia: "Authorized via",
      adminPanelBtn: "Admin Panel",
      signOutBtn: "Sign Out",
      ordersTab: "Orders",
      wishlistTab: "Saved Archives",
      addressTab: "Shipping & Address",
      conciergeTab: "VIP Concierge",
      noOrdersTitle: "No past orders found",
      noOrdersSubtitle: "Your bespoke order history will appear here once placed.",
      exploreBtn: "EXPLORE COLLECTION",
      orderNumber: "ORDER NUMBER",
      placedOn: "Placed on",
      trackingLabel: "Tracking:",
      downloadInvoice: "Download VAT Invoice →",
      emptyArchiveTitle: "Your archive is empty",
      emptyArchiveSubtitle: "Save pieces you admire by clicking the heart icon on any garment.",
      discoverPiecesBtn: "DISCOVER PIECES",
      primaryAddressTitle: "PRIMARY DELIVERY ADDRESS",
      editDetails: "Edit Details",
      addressUpdated: "Delivery address updated successfully.",
      contactPhoneLabel: "Contact Phone:",
      saveChanges: "Save Changes",
      cancelBtn: "Cancel",
      conciergeTag: "PRIVATE CLIENT ADVISORY",
      conciergeTitle: "YUPEK ATELIER CONCIERGE",
      conciergeDesc: "As a registered client, you have direct priority access to our Amsterdam atelier. We assist with bespoke sizing, private showroom viewings, and expedited courier requests.",
      whatsAppConciergeBtn: "WhatsApp Private Concierge",
      bookAppointmentBtn: "Book Atelier Appointment",
    },
    auth: {
      atelierTag: "YUPEK ATELIER",
      clientAccessTitle: "CLIENT ACCESS",
      createAccountTitle: "CREATE ACCOUNT",
      subtitle: "Experience bespoke order tracking, saved archives, and private previews.",
      continueGoogle: "CONTINUE WITH GOOGLE",
      continueApple: "CONTINUE WITH APPLE",
      orViaEmail: "OR VIA EMAIL",
      signInTab: "SIGN IN",
      registerTab: "REGISTER",
      fullNameLabel: "Full Name",
      emailLabel: "Email Address",
      passwordLabel: "Password",
      authenticating: "AUTHENTICATING...",
      enterAtelierBtn: "ENTER ATELIER",
      createProfileBtn: "CREATE CLIENT PROFILE",
      instantPreview: "Instant Preview Access",
      vipDemoBtn: "VIP Client Demo",
      adminDemoBtn: "Admin Demo",
    },
    contact: {
      tag: "DIRECT INQUIRIES",
      title: "ATELIER CONCIERGE",
      subtitle: "Whether you wish to schedule a private viewing in our Amsterdam studio, discuss bespoke sizing, or request international courier options, our concierge team is at your disposal.",
      formTitle: "TRANSMIT AN INQUIRY",
      formSubtitle: "Our private client team typically responds within two hours during atelier working hours.",
      fullName: "Full Name *",
      email: "Email Address *",
      phone: "Telephone (Optional)",
      subject: "Subject of Inquiry",
      message: "Message / Request Details *",
      transmitting: "TRANSMITTING TO ATELIER...",
      sendInquiryBtn: "SEND ATELIER INQUIRY",
      thankYouTitle: "Thank you for your message",
      thankYouDesc: "Your inquiry has been registered with the atelier concierge. A confirmation email and response will follow shortly.",
      sendAnother: "Send another message",
      headquartersTag: "HEADQUARTERS & ATELIER",
      studioTitle: "AMSTERDAM STUDIO",
      conciergeEmail: "Concierge Email",
      telephoneLine: "Telephone & Courier Line",
      visitingHours: "Visiting & Telephone Hours",
      directWhatsAppBtn: "DIRECT CHAT VIA WHATSAPP",
      atelierTour: "Atelier Tour",
      subjects: {
        appointment: "Private Showroom Appointment",
        garments: "Garment Inquiries & Fabric Care",
        order: "Order Tracking & Courier Delivery",
        press: "Press, Styling & Editorial Requests",
        wholesale: "Wholesale & Stockist Partnerships",
      },
    },
    about: {
      manifestoTag: "ATELIER MANIFESTO",
      title: "THE STORY\nOF YUPEK",
      bornMeeting: "YUPEK was born from a meeting of two worlds.",
      bornBody: "Central Asia offers thousands of years of woven textiles, silk trade history, and tactile poetry. Modern Europe offers clean silhouettes, restrained elegance, and daily wearability.",
      taglineBanner: "EASTERN ROOTS • EUROPEAN FORM",
      craftFilm: "Atelier Craftsmanship Film",
      experienceCapsule: "EXPERIENCE THE CAPSULE",
      experienceSubtitle: "Limited batch production engineered for longevity.",
      shopCollectionBtn: "SHOP THE COLLECTION",
      visitAtelierBtn: "VISIT ATELIER",
      blocks: [
        {
          title: "THE ROOTS",
          desc: "Eastern heritage provides our primary aesthetic dialogue: centuries of Turkmen silk weaving, geometric carpet talismans, and cultural memory. Yupek means silk in Turkmen, and silk is where our journey begins.",
        },
        {
          title: "THE MATERIALS",
          desc: "Natural fibres chosen for how they age, breathe, and drape: 100% organic cottons, natural plant-dyed linen, and fluid silk-touch weaves with an unmistakable hand-feel.",
        },
        {
          title: "THE PATTERNS",
          desc: "The geometric language of ancient Central Asian textiles, distilled with quiet European minimalism: an understated label, a reinforced split seam, a singular woven motif.",
        },
        {
          title: "THE EUROPEAN FORM",
          desc: "Europe provides the contemporary environment: architectural metropolises, everyday movement through Amsterdam and Paris, functional minimalism, and timeless European tailoring.",
        },
        {
          title: "PERPETUAL CRAFT",
          desc: "A growing atelier of everyday wardrobe pieces, crafted with meticulous care and rooted in an ancient culture that deserves to be lived in, not merely archived in museums.",
        },
      ],
    },
    lookbook: {
      tag: "VISUAL CHRONICLE",
      title: "LOOKBOOK",
      subtitle: "Central Asian heritage silhouettes reimagined for contemporary European life.",
      chapter: "CHAPTER",
      shopThisLook: "Shop this look →",
      chapters: [
        { title: "HERITAGE", subtitle: "Turkmen Silk Roots & Geometric Geometry" },
        { title: "TEXTURE", subtitle: "Heavyweight 400 GSM Fleece & Organic Cottons" },
        { title: "THE CITY", subtitle: "Fluid Tailoring for Amsterdam, Paris & Berlin" },
        { title: "EVERYDAY", subtitle: "Modern Minimalist Wardrobe Essentials" },
        { title: "PERPETUAL FORM", subtitle: "Timeless Craft Built to Outlast Fast Fashion" },
      ],
    },
    journal: {
      tag: "CHRONICLES & ESSAYS",
      title: "JOURNAL",
      subtitle: "Reflections on textile anthropology, material permanence, and modern European aesthetics.",
      readEssay: "READ ESSAY",
      posts: [
        {
          title: "THE LANGUAGE OF TEXTILES",
          desc: "How ancient woven symbols and carpet motifs carry centuries of memory, translated into modern seams.",
          category: "HERITAGE",
          date: "OCTOBER 2026",
        },
        {
          title: "FROM ASHGABAT TO AMSTERDAM",
          desc: "A journey of form, climate, and architectural dialogue across two distinct continents.",
          category: "JOURNEY",
          date: "SEPTEMBER 2026",
        },
        {
          title: "WHY PATTERNS MATTER",
          desc: "Sacred geometry as a signature of quiet luxury rather than ostentatious branding.",
          category: "DESIGN",
          date: "SEPTEMBER 2026",
        },
        {
          title: "THE ARCHITECTURE OF YUPEK",
          desc: "From hand-drawn calligraphy sketches to finished organic poplin and brushed fleece.",
          category: "ATELIER",
          date: "AUGUST 2026",
        },
        {
          title: "SILK: THE FABRIC BEHIND THE NAME",
          desc: "Why silk remains the most celebrated tactile achievement in the history of global craft.",
          category: "MATERIALS",
          date: "JULY 2026",
        },
      ],
    },
    footer: {
      citySummary: "Amsterdam • Ashgabat • Paris. Contemporary garments inspired by ancient Turkmen silk traditions.",
      followYupek: "Follow YUPEK",
      privacyPolicy: "PRIVACY POLICY",
      termsOfService: "TERMS OF SERVICE",
      complimentaryShipping: "COMPLIMENTARY SHIPPING",
      returns30Days: "30-DAY RETURNS",
    },
    whatsapp: {
      tooltip: "Concierge Online",
      ariaLabel: "Chat on WhatsApp with YUPEK Concierge",
    },
    newsletter: {
      tag: "ATELIER DISPATCH",
      title: "JOIN THE PRIVATE ATELIER CIRCLE",
      subtitle: "Subscribers receive private previews of seasonal capsules, invitations to showroom viewings, and textile essays.",
      emailPlaceholder: "YOUR EMAIL ADDRESS",
      subscribeBtn: "JOIN CIRCLE",
      thankYou: "WELCOME TO THE ATELIER CIRCLE",
      privacyNote: "Strictly confidential. No spam, unsubscribe anytime.",
    },
    searchOverlay: {
      title: "SEARCH ATELIER COLLECTION",
      placeholder: "Tee, Shirt, Silk, Denim...",
      noResults: "NO PIECES MATCH",
      closeAria: "Close search",
    },
  },
  nl: {
    common: {
      freeShippingNotice: "Gratis verzending binnen Europa bij bestellingen vanaf €100",
      complimentaryShipping: "Gratis Verzending",
      allRightsReserved: "ALLE RECHTEN VOORBEHOUDEN",
      quickAdd: "SNEL TOEVOEGEN",
      close: "Sluiten",
      back: "Terug",
      save: "Opslaan",
      cancel: "Annuleren",
      loading: "Laden...",
      error: "Er is een fout opgetreden",
      success: "Succesvol opgeslagen",
    },
    nav: {
      shop: "WINKEL",
      collections: "COLLECTIES",
      journal: "JOURNAAL",
      about: "OVER ATELIER",
      contact: "CONTACT",
      lookbook: "LOOKBOOK",
      wishlist: "VERLANGLIJST",
      account: "ACCOUNT",
      signIn: "INLOGGEN / REGISTREREN",
      signOut: "Uitloggen",
      admin: "Beheerderspaneel",
      search: "Zoeken",
      bag: "Winkelmand",
    },
    announcement: {
      text: "GRATIS VERZENDING BINNEN EUROPA BIJ BESTELLINGEN VANAF €100 — PRIVATE ATELIER BEZOEKEN BESCHIKBAAR",
      badge: "LENTE CAPSULE",
    },
    hero: {
      heritageTag: "CENTRAAL-AZIATISCH ERFGOED • EUROPESE COUTURE",
      title: "YUPEK",
      tagline1: "OOSTERSE WORTELS",
      tagline2: "EUROPESE VORM",
      description: "Hedendaagse kleding geïnspireerd door eeuwenoud Turkmeens zijde-erfgoed, ontworpen voor modern Europees leven.",
      shopBtn: "SHOP COLLECTIE",
      discoverBtn: "ONTDEK YUPEK",
      mute: "Dempen",
      unmute: "Geluid aan",
      play: "Afspelen",
      pause: "Pauzeren",
    },
    manifesto: {
      tag: "FILOSOFIE",
      title: "OOSTERSE WORTELS.\nEUROPESE VORM.",
      body1: "YUPEK vertaalt de verfijnde geometrische beeldtaal en het textielgeheugen van de Zijderoute naar een ingetogen, architecturale garderobe voor het leven in Europese wereldsteden.",
      body2: "Natuurlijke, plantaardig geverfde vezels, zware biologische stoffen en generaties aan vakmanschap—vormgegeven met moderne terughoudendheid.",
    },
    home: {
      newArrivals: "NIEUWE COLLECTIE",
      newArrivalsSub: "ERFGOED, OPNIEUW UITGEVONDEN VOOR 2026.",
      exploreNewArrivals: "BEKIJK ALLE NIEUWE ITEMS",
      editorialTag: "COLLECTIE 01 — HET WEEFWERK",
      editorialTitle: "ZIJDEROUTE ARCHITECTUUR",
      editorialDesc: "Rijk historisch ambacht ontmoet strakke architectonische tailoring. Zwaar biologisch katoen, natuurlijke aardetinten en een vloeiende zijden valling gemaakt voor generaties.",
      editorialBtn: "ONTDEK HET LOOKBOOK",
      madeForEveryday: "GEMAAKT VOOR ELKE DAG",
      madeForEverydaySub: "TIJDLOZE BASISSTUKKEN",
      heritageTag: "OORSPRONG & ARCHIEF",
      heritageTitle: "VAN ERFGOED\nNAAR HET DAGELIJKS LEVEN.",
      heritageDesc1: "YUPEK put uit een beeldtaal gevormd door zijde, geweven textiel, traditionele geometrische motieven en generaties van meesterlijk handwerk.",
      heritageDesc2: "In plaats van erfgoed letterlijk te kopiëren, herinterpreteren we het. Het resultaat is kleding met een diepe herkomst die volkomen natuurlijk aanvoelt in hedendaags Europa.",
      ourStoryBtn: "ONS ATELIER VERHAAL",
      visitShowroomBtn: "BEZOEK SHOWROOM",
      visualLookbook: "VISUEEL LOOKBOOK",
      visualLookbookSub: "LENTE / ZOMER 2026 CAPSULE",
      viewLookbookBtn: "BEKIJK VOLLEDIG LOOKBOOK",
      look1Caption: "Look 01 • Turkmen Heritage T-Shirt & Denim",
      look2Caption: "Look 02 • Geometrisch Zijden Camp Shirt",
      look3Caption: "Look 03 • Zware Geborstelde Fleece",
    },
    shop: {
      title: "WINKEL",
      subtitle: "Hedendaagse kledingstukken geïnspireerd door Oosters erfgoed.",
      filter: "FILTER",
      piecesCount: "STUKS IN ATELIER",
      sort: "SORTEER",
      category: "CATEGORIE",
      size: "MAAT",
      color: "KLEUR",
      price: "PRIJS",
      upTo: "TOT",
      clearAll: "WISSEN",
      noResults: "GEEN STUKS GEVONDEN VOOR DEZE FILTERS.",
      sortFeatured: "UITGELICHT",
      sortNewest: "NIEUWSTE",
      sortPriceAsc: "PRIJS LAAG NAAR HOOG",
      sortPriceDesc: "PRIJS HOOG NAAR LAAG",
      categories: {
        men: "HEREN",
        women: "DAMES",
        unisex: "UNISEX",
        tees: "T-SHIRTS",
        shirts: "OVERHEMDEN",
        sweatshirts: "SWEATERS & HOODIES",
        trousers: "PANTALONS",
        denim: "SPIJKERBROEKEN",
        accessories: "ACCESSOIRES",
        new: "NIEUWE ARTIKELEN",
      },
    },
    product: {
      breadcrumbShop: "WINKEL",
      addToBag: "IN WINKELWAGEN",
      buyNow: "DIRECT KOPEN",
      sizeGuide: "MAATTABEL",
      sizePrompt: "MAAT",
      selectSizeError: "Selecteer alstublieft een maat.",
      descriptionTitle: "BESCHRIJVING",
      materialTitle: "MATERIAAL & ONDERHOUD",
      shippingTitle: "VERZENDING & RETOURNEREN",
      shippingBody: "Gratis standaardlevering binnen Europa bij bestellingen vanaf €100. Spoedverzending via koerier beschikbaar bij het afrekenen. 30 dagen kosteloos retourneren.",
      colorLabel: "KLEUR",
      sizeLabel: "MAAT",
      sizeGuideCaption: "Maattabel, borstomvang in cm",
      chest: "BORST",
      length: "LENGTE",
    },
    cart: {
      title: "WINKELMAND",
      emptyTitle: "UW WINKELMAND IS LEEG.",
      emptySubtitle: "Ontdek tijdloze silhouetten geïnspireerd door Centraal-Aziatisch zijde-erfgoed.",
      continueShopping: "VERDER WINKELEN",
      subtotal: "SUBTOTAAL",
      taxesNote: "Belastingen berekend bij het afrekenen. Gratis 30 dagen retour in de EU.",
      viewBag: "BEKIJK MAND",
      checkout: "AFREKENEN",
      addMoreForFreeShipping: "Voeg nog {amount} toe voor gratis verzending",
      freeShippingUnlocked: "Gratis verzending in Europa ontgrendeld",
      remove: "Verwijderen",
      itemsCount: "artikelen",
    },
    checkout: {
      title: "AFREKENEN",
      tag: "ATELIER VERZENDING",
      clientContact: "01 • KLANTGEGEVENS",
      emailPlaceholder: "UW E-MAILADRES",
      deliveryDestination: "02 • BEZORGADRES",
      firstName: "VOORNAAM",
      lastName: "ACHTERNAAM",
      street: "STRAATNAAM & HUISNUMMER",
      city: "STAD",
      postalCode: "POSTCODE",
      phone: "TELEFOON VOOR KOERIER (+31 ...)",
      shippingMethod: "03 • VERZENDMETHODE",
      standardCourier: "STANDAARD KOERIER BEZORGING",
      standardNote: "3–5 werkdagen (PostNL / DHL)",
      expressCourier: "SPOEDVERZENDING UIT HET ATELIER",
      expressNote: "1–2 werkdagen (DHL Express)",
      complimentary: "GRATIS",
      paymentMethod: "04 • BETAALMETHODE",
      creditCard: "Creditcard",
      ideal: "iDEAL / SEPA",
      applePay: "Apple Pay",
      securityNote: "Beveiligd met 256-bit TLS-encryptie. Onmiddellijke verzending vanuit Centraal-Europees atelier.",
      placeOrder: "BESTELLING PLAATSEN",
      processingOrder: "BESTELLING WORDT VERWERKT...",
      orderSummary: "OVERZICHT BESTELLING",
      inclVat: "INCL. 21% BTW",
      estimatedTotal: "TOTAALBEDRAG",
      orderConfirmed: "BESTELLING BEVESTIGD",
      thankYou: "HARTELIJK DANK VOOR UW BESTELLING",
      confirmationDispatched: "Uw order is doorgestuurd naar ons Amsterdamse atelier. Een bevestigingsbewijs is verzonden naar uw e-mailadres.",
      viewInAccount: "BEKIJK IN MIJN ACCOUNT",
      continueBrowsing: "VERDER WINKELEN",
    },
    account: {
      portalTag: "ATELIER PORTAL",
      clientAccess: "KLANTENTOEGANG",
      signInPrompt: "Log in met uw Google-, Apple- of Atelier-account om uw bestellingen te volgen, bezorgadressen te beheren en privécollecties te bekijken.",
      continueGoogle: "DOORGAAN MET GOOGLE",
      continueApple: "DOORGAAN MET APPLE",
      signInEmail: "INLOGGEN MET E-MAIL",
      demoSession: "Directe Demo Toegang",
      vipClientDemo: "Inloggen als VIP Klant",
      adminDemo: "Inloggen als Beheerder",
      vipMemberTag: "Atelier Circle VIP",
      adminMemberTag: "Meester Atelier Beheerder",
      signedVia: "Geautoriseerd via",
      adminPanelBtn: "Beheerderspaneel",
      signOutBtn: "Uitloggen",
      ordersTab: "Bestellingen",
      wishlistTab: "Opgeslagen Archief",
      addressTab: "Adres & Bezorging",
      conciergeTab: "VIP Conciërge",
      noOrdersTitle: "Geen eerdere bestellingen gevonden",
      noOrdersSubtitle: "Uw bestelgeschiedenis verschijnt hier zodra u een order plaatst.",
      exploreBtn: "ONTDEK COLLECTIE",
      orderNumber: "BESTELNUMMER",
      placedOn: "Geplaatst op",
      trackingLabel: "Track & Trace:",
      downloadInvoice: "Download BTW Factuur →",
      emptyArchiveTitle: "Uw archief is leeg",
      emptyArchiveSubtitle: "Bewaar kledingstukken die u aanspreken door op het harticoon te klikken.",
      discoverPiecesBtn: "ONTDEK KLEDINGSTUKKEN",
      primaryAddressTitle: "PRIMAIR BEZORGADRES",
      editDetails: "Gegevens Bewerken",
      addressUpdated: "Bezorgadres succesvol bijgewerkt.",
      contactPhoneLabel: "Telefoonnummer:",
      saveChanges: "Wijzigingen Opslaan",
      cancelBtn: "Annuleren",
      conciergeTag: "PRIVÉ KLANTENADVICE",
      conciergeTitle: "YUPEK ATELIER CONCIËRGE",
      conciergeDesc: "Als geregistreerde cliënt heeft u directe voorrang bij ons Amsterdamse atelier. Wij assisteren bij maatmaatwerk, privé showroombezichtigingen en spoedkoeriers.",
      whatsAppConciergeBtn: "WhatsApp Privé Conciërge",
      bookAppointmentBtn: "Boek Atelier Afspraak",
    },
    auth: {
      atelierTag: "YUPEK ATELIER",
      clientAccessTitle: "KLANTENTOEGANG",
      createAccountTitle: "ACCOUNT AANMAKEN",
      subtitle: "Ervaar persoonlijke orderopvolging, bewaarde favorieten en exclusieve previews.",
      continueGoogle: "DOORGAAN MET GOOGLE",
      continueApple: "DOORGAAN MET APPLE",
      orViaEmail: "OF MET E-MAIL",
      signInTab: "INLOGGEN",
      registerTab: "REGISTREREN",
      fullNameLabel: "Volledige Naam",
      emailLabel: "E-mailadres",
      passwordLabel: "Wachtwoord",
      authenticating: "VERIFIËREN...",
      enterAtelierBtn: "ATELIER BETREDEN",
      createProfileBtn: "PROFIEL AANMAKEN",
      instantPreview: "Snelle Demo Toegang",
      vipDemoBtn: "VIP Klant Demo",
      adminDemoBtn: "Beheerder Demo",
    },
    contact: {
      tag: "DIRECT CONTACT",
      title: "ATELIER CONCIËRGE",
      subtitle: "Of u nu een privéafspraak wilt in onze Amsterdamse studio, maatspecificaties wilt bespreken of internationale koeriersopties wilt aanvragen: ons team staat tot uw beschikking.",
      formTitle: "STUUR EEN BERICHT",
      formSubtitle: "Ons particuliere klantenteam reageert doorgaans binnen twee uur tijdens kantooruren.",
      fullName: "Volledige Naam *",
      email: "E-mailadres *",
      phone: "Telefoonnummer (Optioneel)",
      subject: "Onderwerp van het bericht",
      message: "Bericht & details van uw aanvraag *",
      transmitting: "BEZORGEN BIJ ATELIER...",
      sendInquiryBtn: "VERSTUUR AANVRAAG",
      thankYouTitle: "Hartelijk dank voor uw bericht",
      thankYouDesc: "Uw aanvraag is geregistreerd bij de atelier conciërge. U ontvangt spoedig een bevestiging per e-mail.",
      sendAnother: "Nog een bericht versturen",
      headquartersTag: "HOOFDKANTOOR & ATELIER",
      studioTitle: "AMSTERDAM STUDIO",
      conciergeEmail: "Conciërge E-mail",
      telephoneLine: "Telefoon & Koeriersdienst",
      visitingHours: "Bezoek- & Openingstijden",
      directWhatsAppBtn: "DIRECT CHATTEN VIA WHATSAPP",
      atelierTour: "Atelier Tour",
      subjects: {
        appointment: "Privé Showroom Afspraak",
        garments: "Vragen over Kleding & Stoffenverzorging",
        order: "Bestelling Volgen & Koeriersdienst",
        press: "Pers-, Styling- & Redactieaanvragen",
        wholesale: "Groothandel & Boetiek Partnerschappen",
      },
    },
    about: {
      manifestoTag: "ATELIER MANIFEST",
      title: "HET VERHAAL\nVAN YUPEK",
      bornMeeting: "YUPEK ontstond uit een ontmoeting van twee werelden.",
      bornBody: "Centraal-Azië brengt duizenden jaren aan geweven textiel, zijderoute-geschiedenis en tactiele poëzie. Modern Europa biedt strakke silhouetten, ingetogen elegantie en dagelijkse draagbaarheid.",
      taglineBanner: "OOSTERSE WORTELS • EUROPESE VORM",
      craftFilm: "Atelier Vakmanschapsfilm",
      experienceCapsule: "ERVAAR DE CAPSULE",
      experienceSubtitle: "Gelimiteerde productie gebouwd voor een lange levensduur.",
      shopCollectionBtn: "SHOP DE COLLECTIE",
      visitAtelierBtn: "BEZOEK ATELIER",
      blocks: [
        {
          title: "DE WORTELS",
          desc: "Oosters erfgoed vormt onze primaire esthetische dialoog: eeuwen van Turkmeens zijde-weven, geometrische tapijttalismannen en cultureel geheugen. Yupek betekent zijde in het Turkmeens, en zijde is waar onze reis begint.",
        },
        {
          title: "DE MATERIALEN",
          desc: "Natuurlijke vezels geselecteerd op hoe ze ademen, vallen en verouderen: 100% biologisch katoen, natuurlijk plantaardig geverfd linnen en vloeibaar zijde-achtig weefsel.",
        },
        {
          title: "DE MOTIEVEN",
          desc: "De geometrische taal van eeuwenoud Centraal-Aziatisch textiel, gereduceerd met stille Europese eenvoud: een subtiel etiket, een versterkte zijnaad, een enkel geweven motief.",
        },
        {
          title: "DE EUROPESE VORM",
          desc: "Europa biedt de hedendaagse leefomgeving: architecturale steden, dagelijkse dynamiek in Amsterdam en Parijs, functioneel minimalisme en tijdloze Europese snit.",
        },
        {
          title: "BLIJVEND AMBACHT",
          desc: "Een groeiend atelier van tijdloze garderobestukken, met uiterste precisie vervaardigd en geworteld in een cultuur die gedragen moet worden, en niet enkel in vitrines bewaard.",
        },
      ],
    },
    lookbook: {
      tag: "VISUELE KRONIEK",
      title: "LOOKBOOK",
      subtitle: "Centraal-Aziatische erfgoedsilhouetten opnieuw ontworpen voor hedendaags Europees leven.",
      chapter: "HOOFDSTUK",
      shopThisLook: "Shop deze look →",
      chapters: [
        { title: "ERFGOED", subtitle: "Turkmeense Zijderoute & Geometrische Lijnen" },
        { title: "STRUCTUUR", subtitle: "Zware 400 GSM Fleece & Biologisch Katoen" },
        { title: "DE STAD", subtitle: "Vloeiende Maatvoering voor Amsterdam, Parijs & Berlijn" },
        { title: "DAGELIJKS", subtitle: "Moderne Minimalistische Garderobe Essentials" },
        { title: "BLIJVENDE VORM", subtitle: "Tijdloos Ambacht Gemaakt om Fast Fashion te Overstijgen" },
      ],
    },
    journal: {
      tag: "KRONIEKEN & ESSAYS",
      title: "JOURNAAL",
      subtitle: "Bespiegelingen over textielantropologie, materiële duurzaamheid en moderne Europese esthetiek.",
      readEssay: "LEES ESSAY",
      posts: [
        {
          title: "DE TAAL VAN TEXTIEL",
          desc: "Hoe eeuwenoude geweven symbolen en tapijtmotieven generaties aan geheugen dragen, vertaald naar moderne naden.",
          category: "ERFGOED",
          date: "OKTOBER 2026",
        },
        {
          title: "VAN ASJGABAT NAAR AMSTERDAM",
          desc: "Een reis van vorm, klimaat en architecturale dialoog tussen twee verschillende continenten.",
          category: "REIS",
          date: "SEPTEMBER 2026",
        },
        {
          title: "WAAROM PATRONEN ERTOE DOEN",
          desc: "Heilige geometrie als handtekening van stille luxe in plaats van schreeuwerige merknamen.",
          category: "ONTWERP",
          date: "SEPTEMBER 2026",
        },
        {
          title: "DE ARCHITECTUUR VAN YUPEK",
          desc: "Van handgetekende kalligrafieschetsen tot verfijnd biologisch popeline en geborsteld fleece.",
          category: "ATELIER",
          date: "AUGUSTUS 2026",
        },
        {
          title: "ZIJDE: DE STOF ACHTER DE NAAM",
          desc: "Waarom zijde het meest gevierde tastbare resultaat blijft in de geschiedenis van mondiaal handwerk.",
          category: "MATERIALEN",
          date: "JULI 2026",
        },
      ],
    },
    footer: {
      citySummary: "Amsterdam • Asjgabat • Parijs. Hedendaagse kleding geïnspireerd door eeuwenoude Turkmeense zijde-tradities.",
      followYupek: "Volg YUPEK",
      privacyPolicy: "PRIVACYBELEID",
      termsOfService: "ALGEMENE VOORWAARDEN",
      complimentaryShipping: "GRATIS VERZENDING",
      returns30Days: "30 DAGEN RETOURNEREN",
    },
    whatsapp: {
      tooltip: "Conciërge Online",
      ariaLabel: "Chat op WhatsApp met de YUPEK Conciërge",
    },
    newsletter: {
      tag: "ATELIER BERICHT",
      title: "WORD LID VAN DE ATELIER CIRCLE",
      subtitle: "Leden ontvangen exclusieve previews van seizoenscapsules, uitnodigingen voor showroombezichtigingen en textielessays.",
      emailPlaceholder: "UW E-MAILADRES",
      subscribeBtn: "AANMELDEN",
      thankYou: "WELKOM BIJ DE ATELIER CIRCLE",
      privacyNote: "Strikt vertrouwelijk. Geen spam, op elk moment opzegbaar.",
    },
    searchOverlay: {
      title: "ZOEKEN IN ATELIER COLLECTIE",
      placeholder: "T-shirt, Overhemd, Zijde, Spijkerbroek...",
      noResults: "GEEN STUKS GEVONDEN VOOR",
      closeAria: "Zoekvenster sluiten",
    },
  },
};
