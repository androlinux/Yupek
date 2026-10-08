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
    euRulesTitle: string;
    euRulesBody: string;
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
    brandTag: string;
    clientAccessTitle: string;
    createAccountTitle: string;
    subtitle: string;
    continueGoogle: string;
    orViaEmail: string;
    signInTab: string;
    registerTab: string;
    fullNameLabel: string;
    emailLabel: string;
    passwordLabel: string;
    authenticating: string;
    enterStoreBtn: string;
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
    studioTour: string;
    cardTitle?: string;
    cardDescription?: string;
    subjects: {
      appointment?: string;
      garments?: string;
      order?: string;
      press?: string;
      wholesale?: string;
      productInfo?: string;
      sizingFit?: string;
      orderSupport?: string;
      shippingDelivery?: string;
      returnsExchanges?: string;
      generalEnquiry?: string;
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
    visitStudioBtn: string;
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
    shippingPolicy: string;
    returns30Days: string;
    euCompliance: string;
    cookiePreferences: string;
    supportService: string;
    contactSupport: string;
    orderHelp: string;
    needHelp: string;
    needHelpDesc: string;
  };
  cookies: {
    bannerTitle: string;
    bannerDescription: string;
    acceptAll: string;
    rejectNonEssential: string;
    cookieSettings: string;
    savePreferences: string;
    modalTitle: string;
    modalSubtitle: string;
    essentialTitle: string;
    essentialStatus: string;
    essentialDesc: string;
    analyticsTitle: string;
    analyticsStatusOff: string;
    analyticsStatusOn: string;
    analyticsDesc: string;
    marketingTitle: string;
    marketingStatusOff: string;
    marketingStatusOn: string;
    marketingDesc: string;
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
  returnsPage: {
    heroTag: string;
    heroTitle: string;
    heroSubtitle: string;
    policyHighlights: Array<{
      badge: string;
      title: string;
      desc: string;
    }>;
    withdrawalTitle: string;
    withdrawalSubtitle: string;
    withdrawalBody1: string;
    withdrawalBody2: string;
    conditionsTitle: string;
    conditions: string[];
    guaranteeTitle: string;
    guaranteeSubtitle: string;
    guaranteeBody1: string;
    guaranteeBody2: string;
    euRegulationsTitle: string;
    euRegulationsSubtitle: string;
    regulationsList: Array<{
      directive: string;
      title: string;
      scope: string;
      description: string;
    }>;
    stepsTitle: string;
    stepsSubtitle: string;
    steps: Array<{
      stepNumber: string;
      title: string;
      desc: string;
    }>;
    addressTitle: string;
    addressSubtitle: string;
    addressLines: string[];
    conciergeTitle: string;
    conciergeSubtitle: string;
    contactEmailBtn: string;
    contactWhatsAppBtn: string;
    odrTitle: string;
    odrDesc: string;
    odrPlatformBtn: string;
  };
  a11y: {
    floatingButtonLabel: string;
    floatingTooltip: string;
    drawerTitle: string;
    drawerSubtitle: string;
    screenReaderTitle: string;
    screenReaderDesc: string;
    readPageBtn: string;
    readSelectionBtn: string;
    stopSpeechBtn: string;
    pauseSpeechBtn: string;
    resumeSpeechBtn: string;
    speakingNow: string;
    speechRateLabel: string;
    rateSlow: string;
    rateNormal: string;
    rateFast: string;
    colorBlindTitle: string;
    colorBlindDesc: string;
    colorModes: {
      normal: { name: string; desc: string };
      highContrast: { name: string; desc: string };
      deuteranopia: { name: string; desc: string };
      protanopia: { name: string; desc: string };
      tritanopia: { name: string; desc: string };
      monochrome: { name: string; desc: string };
    };
    readingTitle: string;
    textSizeLabel: string;
    textNormal: string;
    textLarge: string;
    textXLarge: string;
    dyslexiaFontLabel: string;
    dyslexiaFontDesc: string;
    readingGuideLabel: string;
    readingGuideDesc: string;
    highlightLinksLabel: string;
    highlightLinksDesc: string;
    motionTitle: string;
    pauseAnimationsLabel: string;
    pauseAnimationsDesc: string;
    resetAllBtn: string;
    savedNote: string;
    closeBtn: string;
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
      about: "ABOUT YUPEK",
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
      text: "COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100 — CLIENT CONCIERGE ASSISTANCE AVAILABLE",
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
      ourStoryBtn: "OUR BRAND STORY",
      visitShowroomBtn: "CLIENT CONCIERGE",
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
      piecesCount: "PIECES IN COLLECTION",
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
      euRulesTitle: "EU COMPLIANCE & 2-YEAR GUARANTEE",
      euRulesBody: "Protected by EU Directive (EU) 2019/771 with a mandatory 2-year statutory legal conformity guarantee against defects. 30-day extended withdrawal rights (Directive 2011/83/EU). Compliant with EU Textile Regulation No 1007/2011 and REACH non-toxic safety (EC 1907/2006).",
    },
    cart: {
      title: "BAG",
      emptyTitle: "YOUR BAG IS EMPTY.",
      emptySubtitle: "Discover timeless silhouettes inspired by Central Asian silk heritage.",
      continueShopping: "CONTINUE SHOPPING",
      subtotal: "SUBTOTAL",
      taxesNote: "Free 30-day EU returns.",
      viewBag: "VIEW BAG",
      checkout: "CHECKOUT",
      addMoreForFreeShipping: "Add {amount} for complimentary shipping",
      freeShippingUnlocked: "Complimentary EU Shipping Unlocked",
      remove: "Remove",
      itemsCount: "items",
    },
    checkout: {
      title: "CHECKOUT",
      tag: "ORDER DISPATCH",
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
      expressCourier: "EXPRESS PRIORITY DISPATCH",
      expressNote: "1–2 working days (DHL Express)",
      complimentary: "COMPLIMENTARY",
      paymentMethod: "04 • PAYMENT METHOD",
      creditCard: "Credit Card",
      ideal: "iDEAL / SEPA",
      applePay: "Apple Pay",
      securityNote: "Encrypted with 256-bit TLS security. Immediate dispatch from Central European fulfillment.",
      placeOrder: "PLACE ORDER",
      processingOrder: "PROCESSING YOUR ORDER...",
      orderSummary: "ORDER SUMMARY",
      inclVat: "INCL. 21% VAT",
      estimatedTotal: "ESTIMATED TOTAL",
      orderConfirmed: "ORDER CONFIRMED",
      thankYou: "THANK YOU FOR YOUR PATRONAGE",
      confirmationDispatched: "Your order has been received by our Amsterdam team. A confirmation receipt has been dispatched to your email.",
      viewInAccount: "VIEW IN MY ACCOUNT",
      continueBrowsing: "CONTINUE BROWSING",
    },
    account: {
      portalTag: "CLIENT PORTAL",
      clientAccess: "CLIENT ACCESS",
      signInPrompt: "Sign in with your Google or YUPEK account to track order dispatches, manage your delivery addresses, and view private collections.",
      continueGoogle: "CONTINUE WITH GOOGLE",
      signInEmail: "SIGN IN WITH EMAIL",
      demoSession: "Instant Demo Session",
      vipClientDemo: "Log In As VIP Client",
      adminDemo: "Log In As Admin",
      vipMemberTag: "YUPEK Circle VIP",
      adminMemberTag: "Store Administrator",
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
      conciergeTitle: "YUPEK CLIENT CONCIERGE",
      conciergeDesc: "As a registered client, you have direct priority access to our client concierge team. We assist with bespoke sizing, product details, and expedited courier requests.",
      whatsAppConciergeBtn: "WhatsApp Client Concierge",
      bookAppointmentBtn: "Contact Concierge",
    },
    auth: {
      brandTag: "YUPEK",
      clientAccessTitle: "CLIENT ACCESS",
      createAccountTitle: "CREATE ACCOUNT",
      subtitle: "Experience bespoke order tracking, saved archives, and private previews.",
      continueGoogle: "CONTINUE WITH GOOGLE",
      orViaEmail: "OR VIA EMAIL",
      signInTab: "SIGN IN",
      registerTab: "REGISTER",
      fullNameLabel: "Full Name",
      emailLabel: "Email Address",
      passwordLabel: "Password",
      authenticating: "AUTHENTICATING...",
      enterStoreBtn: "ENTER STORE",
      createProfileBtn: "CREATE CLIENT PROFILE",
      instantPreview: "Instant Preview Access",
      vipDemoBtn: "VIP Client Demo",
      adminDemoBtn: "Admin Demo",
    },
    contact: {
      tag: "DIGITAL CLIENT CARE",
      title: "CLIENT CONCIERGE",
      subtitle: "Whether you have a question about sizing, product details, an order, or international delivery, our client concierge team is here to assist.\n\nFor private product questions or styling enquiries, customers can contact us directly by email or our contact form.",
      formTitle: "TRANSMIT AN INQUIRY",
      formSubtitle: "Our client concierge team typically responds within two hours during customer care hours.",
      fullName: "Full Name *",
      email: "Email Address *",
      phone: "Telephone (Optional)",
      subject: "Subject of Inquiry",
      message: "Message / Request Details *",
      transmitting: "TRANSMITTING INQUIRY...",
      sendInquiryBtn: "SEND INQUIRY",
      thankYouTitle: "Thank you for your message",
      thankYouDesc: "Your inquiry has been registered with client concierge. A confirmation email and response will follow shortly.",
      sendAnother: "Send another message",
      headquartersTag: "DIGITAL CLIENT CONCIERGE",
      studioTitle: "YUPEK CLIENT CONCIERGE",
      conciergeEmail: "EMAIL",
      telephoneLine: "TELEPHONE",
      visitingHours: "CUSTOMER CARE",
      directWhatsAppBtn: "CONTACT SUPPORT",
      studioTour: "Customer Care",
      cardTitle: "YUPEK CLIENT CONCIERGE",
      cardDescription: "Our client concierge team is available to assist with orders, sizing, product details, shipping and general enquiries.",
      subjects: {
        productInfo: "Product Information",
        sizingFit: "Sizing & Fit",
        orderSupport: "Order Support",
        shippingDelivery: "Shipping & Delivery",
        returnsExchanges: "Returns & Exchanges",
        wholesale: "Wholesale / Collaboration",
        generalEnquiry: "General Enquiry",
      },
    },
    about: {
      manifestoTag: "BRAND MANIFESTO",
      title: "THE STORY\nOF YUPEK",
      bornMeeting: "YUPEK was born from a meeting of two worlds.",
      bornBody: "Central Asia offers thousands of years of woven textiles, silk trade history, and tactile poetry. Modern Europe offers clean silhouettes, restrained elegance, and daily wearability.",
      taglineBanner: "EASTERN ROOTS • EUROPEAN FORM",
      craftFilm: "Heritage Craftsmanship Film",
      experienceCapsule: "EXPERIENCE THE CAPSULE",
      experienceSubtitle: "Limited batch production engineered for longevity.",
      shopCollectionBtn: "SHOP THE COLLECTION",
      visitStudioBtn: "CLIENT CONCIERGE",
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
          desc: "A growing collection of everyday wardrobe pieces, crafted with meticulous care and rooted in an ancient culture that deserves to be lived in, not merely archived in museums.",
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
          category: "COLLECTION",
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
      shippingPolicy: "SHIPPING POLICY",
      returns30Days: "30-DAY RETURNS",
      euCompliance: "EU CONSUMER COMPLIANCE",
      cookiePreferences: "COOKIE PREFERENCES",
      supportService: "SUPPORT SERVICE",
      contactSupport: "Contact Support",
      orderHelp: "Order Help",
      needHelp: "Need help?",
      needHelpDesc: "Contact our support service for personal assistance with your order or enquiries.",
    },
    cookies: {
      bannerTitle: "YUPEK uses cookies",
      bannerDescription:
        "We use essential cookies to keep YUPEK working. With your permission, we may also use analytics and marketing cookies to improve your experience and understand how our website is used.",
      acceptAll: "ACCEPT ALL",
      rejectNonEssential: "REJECT NON-ESSENTIAL",
      cookieSettings: "COOKIE SETTINGS",
      savePreferences: "SAVE PREFERENCES",
      modalTitle: "Cookie Settings",
      modalSubtitle:
        "Manage your cookie preferences. Essential cookies are required for the website to function.",
      essentialTitle: "Essential",
      essentialStatus: "Always active",
      essentialDesc: "Required for the website to function.",
      analyticsTitle: "Analytics",
      analyticsStatusOff: "Off by default",
      analyticsStatusOn: "Active",
      analyticsDesc: "Helps us understand how visitors use YUPEK and improve the website.",
      marketingTitle: "Marketing",
      marketingStatusOff: "Off by default",
      marketingStatusOn: "Active",
      marketingDesc: "Used to measure and improve marketing and advertising.",
    },
    whatsapp: {
      tooltip: "Concierge Online",
      ariaLabel: "Chat on WhatsApp with YUPEK Concierge",
    },
    newsletter: {
      tag: "ORDER DISPATCH",
      title: "JOIN THE PRIVATE YUPEK CIRCLE",
      subtitle: "Subscribers receive private previews of seasonal capsules, special announcements, and textile essays.",
      emailPlaceholder: "YOUR EMAIL ADDRESS",
      subscribeBtn: "JOIN CIRCLE",
      thankYou: "WELCOME TO THE YUPEK CIRCLE",
      privacyNote: "Strictly confidential. No spam, unsubscribe anytime.",
    },
    searchOverlay: {
      title: "SEARCH YUPEK COLLECTION",
      placeholder: "Tee, Shirt, Silk, Denim...",
      noResults: "NO PIECES MATCH",
      closeAria: "Close search",
    },
    returnsPage: {
      heroTag: "CONSUMER RIGHTS • STATUTORY PROTECTIONS",
      heroTitle: "RETURN POLICY &\nEU REGULATIONS",
      heroSubtitle: "Full transparency regarding your 30-day right of withdrawal, 2-year statutory legal conformity guarantee, and European product safety standards.",
      policyHighlights: [
        {
          badge: "30 DAYS",
          title: "Extended Withdrawal Right",
          desc: "Statutory 14-day EU right of withdrawal (Directive 2011/83/EU) extended to 30 calendar days by YUPEK.",
        },
        {
          badge: "2 YEARS",
          title: "Legal Guarantee of Conformity",
          desc: "Comprehensive protection against defects in materials and craft under Directive (EU) 2019/771 & Dutch Civil Code Book 7.",
        },
        {
          badge: "100% EU",
          title: "Certified Textile Compliance",
          desc: "Accurate fibre labelling under Regulation (EU) No 1007/2011 and REACH non-toxic safety (Regulation EC 1907/2006).",
        },
        {
          badge: "FAST REFUND",
          title: "Prompt Reimbursement",
          desc: "Full refunds processed within 14 calendar days to your original payment method upon item inspection.",
        },
      ],
      withdrawalTitle: "30-DAY STATUTORY RIGHT OF WITHDRAWAL",
      withdrawalSubtitle: "EU Directive 2011/83/EU & YUPEK Standard",
      withdrawalBody1: "In accordance with European Union Directive 2011/83/EU on Consumer Rights, you have the statutory right to withdraw from your purchase within 14 days without giving any reason. At YUPEK, we proudly extend this period to 30 calendar days from the day on which you, or a third party designated by you, acquire physical possession of the items.",
      withdrawalBody2: "To exercise your right of withdrawal, simply notify us via your account, email (daniyarow16@gmail.com), or our contact portal. When you withdraw from the contract in full, we will reimburse all payments received from you, including initial standard delivery costs, without undue delay and at the latest within 14 days from the day we receive the returned items or proof of return shipment.",
      conditionsTitle: "Return Conditions & Integrity Criteria",
      conditions: [
        "Garments must be returned unworn, unwashed, unaltered, and undamaged.",
        "All original YUPEK textile labels, security tags, and packaging seals must remain attached and untampered.",
        "Items must be returned inside their original protective luxury dustbags, bespoke boxes, and packaging.",
        "Trying on garments for sizing and fit in the same manner as in a physical boutique is fully permitted; wearing items beyond initial fitting impairs return validity.",
      ],
      guaranteeTitle: "2-YEAR STATUTORY LEGAL CONFORMITY GUARANTEE",
      guaranteeSubtitle: "Directive (EU) 2019/771 & Dutch Consumer Law",
      guaranteeBody1: "Every garment purchased from YUPEK is protected by a mandatory 2-year statutory legal conformity guarantee under Directive (EU) 2019/771 on the Sale of Goods and the Dutch Civil Code (Burgerlijk Wetboek, Boek 7).",
      guaranteeBody2: "If a piece presents a lack of conformity—such as unexpected seam failure, zipper or button detachment, fabric distortion not resulting from improper care, or discrepancy with published specifications—you are entitled to remedy free of charge. We provide repair or immediate replacement; if repair or replacement is impossible or disproportionate, you may request an appropriate price reduction or full refund.",
      euRegulationsTitle: "EU PRODUCT REGULATIONS & SAFETY COMPLIANCE",
      euRegulationsSubtitle: "Strict adherence to European Union health, environmental, and consumer protection laws",
      regulationsList: [
        {
          directive: "Regulation (EU) No 1007/2011",
          title: "Textile Fibre Names & Labelling",
          scope: "Fibre Purity & Transparency",
          description: "Mandatory complete disclosure of all textile compositions by percentage weight (e.g. 100% Mulberry Silk, 100% Organic Cotton). Any non-textile parts of animal origin (such as natural mother-of-pearl buttons or horn accents) are explicitly labelled according to EU law.",
        },
        {
          directive: "Regulation (EC) No 1907/2006",
          title: "REACH Chemical Safety & Non-Toxicity",
          scope: "Health & Environmental Safety",
          description: "All textiles, organic natural dyes, and metal hardware comply with the European Union REACH Regulation. Free from restricted azo colourants, heavy metals, harmful formaldehyde, carcinogenic substances, and harmful PFAS.",
        },
        {
          directive: "Regulation (EU) 2023/988 / GPSR",
          title: "General Product Safety & Traceability",
          scope: "Consumer Protection & Accountability",
          description: "Products are designed, manufactured, and inspected to the highest European safety standards. Responsible economic operator established in the European Union: YUPEK (Client Concierge: daniyarov16@gmail.com).",
        },
        {
          directive: "Directive 2000/31/EC & GDPR",
          title: "Data Protection & Digital Fairness",
          scope: "Privacy & Fair Commerce",
          description: "Your orders, payment credentials, and personal records are processed under strict European General Data Protection Regulation (EU 2016/679) standards with zero third-party commercial marketing sharing. Data is shared exclusively with necessary printing, payment, and delivery partners to fulfill your purchase.",
        },
      ],
      stepsTitle: "HOW TO INITIATE A RETURN",
      stepsSubtitle: "Simple 4-step concierge process",
      steps: [
        {
          stepNumber: "01",
          title: "Contact Concierge",
          desc: "Notify our team via your account portal, email, or our contact form with your order number (e.g., YPK-2026-XXXX).",
        },
        {
          stepNumber: "02",
          title: "Repack in Original Box",
          desc: "Place garments carefully into their original protective dustbag and shipping box with security labels attached.",
        },
        {
          stepNumber: "03",
          title: "Courier Dispatch",
          desc: "Affix the prepaid return label provided by our concierge and hand over to your nearest courier depot (DHL, PostNL, UPS).",
        },
        {
          stepNumber: "04",
          title: "Inspection & Prompt Refund",
          desc: "Upon receipt, our master tailors inspect the piece within 48 hours. Reimbursement is promptly released to your original payment method.",
        },
      ],
      addressTitle: "RETURN PROCESSING",
      addressSubtitle: "Digital concierge return process",
      addressLines: [
        "YUPEK Returns & Quality Inspection",
        "Returns are processed via prepaid tracked courier labels.",
        "Request your complimentary return label by contacting our client concierge.",
        "Online Customer Care: daniyarov16@gmail.com",
      ],
      conciergeTitle: "NEED PERSONAL ASSISTANCE?",
      conciergeSubtitle: "Our client concierge is at your disposal for sizing exchanges, return labels, or technical inquiries.",
      contactEmailBtn: "EMAIL CONCIERGE",
      contactWhatsAppBtn: "CONTACT SUPPORT",
      odrTitle: "EUROPEAN ONLINE DISPUTE RESOLUTION (ODR)",
      odrDesc: "In accordance with Article 14(1) of EU Regulation No 524/2013, the European Commission provides an online platform for out-of-court dispute resolution between European consumers and online traders.",
      odrPlatformBtn: "VISIT EU ODR PLATFORM",
    },
    a11y: {
      floatingButtonLabel: "Accessibility & Reading Tools",
      floatingTooltip: "Accessibility & Color Blindness",
      drawerTitle: "ACCESSIBILITY & READABILITY",
      drawerSubtitle: "Audio screen reading, dyslexia-friendly typography & color vision adjustments",
      screenReaderTitle: "AUDIO SCREEN READER (TEXT-TO-SPEECH)",
      screenReaderDesc: "Listen to the current page, lookbook essays, or garment descriptions with natural speech synthesis.",
      readPageBtn: "READ PAGE ALOUD",
      readSelectionBtn: "READ SELECTED TEXT",
      stopSpeechBtn: "STOP READING",
      pauseSpeechBtn: "PAUSE",
      resumeSpeechBtn: "RESUME",
      speakingNow: "Reading aloud...",
      speechRateLabel: "READING SPEED",
      rateSlow: "0.8x (Relaxed)",
      rateNormal: "1.0x (Standard)",
      rateFast: "1.2x (Brisk)",
      colorBlindTitle: "COLOR BLINDNESS & CONTRAST MODES",
      colorBlindDesc: "Scientifically calibrated Daltonization filters and high-contrast adaptations for varied color vision.",
      colorModes: {
        normal: {
          name: "Default Palette",
          desc: "Original curated Turkmen silk & European architectural palette.",
        },
        highContrast: {
          name: "High Contrast (WCAG AAA)",
          desc: "Maximum contrast deep black background with crisp white & luminous gold.",
        },
        deuteranopia: {
          name: "Deuteranopia Filter",
          desc: "Green-weak adaptation: eliminates red-green confusion by shifting hues.",
        },
        protanopia: {
          name: "Protanopia Filter",
          desc: "Red-weak adaptation: enhances contrast and shifts red frequencies into visible spectrum.",
        },
        tritanopia: {
          name: "Tritanopia Filter",
          desc: "Blue-yellow adaptation: heightened luminance between blue and green tones.",
        },
        monochrome: {
          name: "Monochromacy / Grayscale",
          desc: "Pure high-contrast grayscale for complete color blindness (achromatopsia).",
        },
      },
      readingTitle: "READING & TYPOGRAPHY ASSISTANCE",
      textSizeLabel: "TEXT SCALING",
      textNormal: "Standard (100%)",
      textLarge: "Large (115%)",
      textXLarge: "Extra Large (130%)",
      dyslexiaFontLabel: "Dyslexia-Friendly Typography",
      dyslexiaFontDesc: "High-legibility letterforms, increased character spacing & generous line height.",
      readingGuideLabel: "Reading Ruler / Focus Guide",
      readingGuideDesc: "Translucent guide bar following cursor to maintain line focus while reading.",
      highlightLinksLabel: "Underline & Highlight Hyperlinks",
      highlightLinksDesc: "Ensures interactive links are prominently distinguishable without relying on color.",
      motionTitle: "MOTION & VISUAL COMFORT",
      pauseAnimationsLabel: "Pause Animations & Autoplay",
      pauseAnimationsDesc: "Disables editorial video autoplay, marquee tickers, and motion transitions.",
      resetAllBtn: "RESET ALL ASSISTIVE SETTINGS",
      savedNote: "Preferences are automatically remembered across your browsing session.",
      closeBtn: "Close Accessibility Menu",
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
      about: "OVER YUPEK",
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
      text: "GRATIS VERZENDING BINNEN EUROPA BIJ BESTELLINGEN VANAF €100 — CLIËNT CONCIËRGE BESCHIKBAAR",
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
      ourStoryBtn: "ONS MERKVERHAAL",
      visitShowroomBtn: "CLIËNT CONCIËRGE",
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
      piecesCount: "STUKS IN COLLECTIE",
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
      euRulesTitle: "EU CONFORMITEIT & 2 JAAR GARANTIE",
      euRulesBody: "Beschermd onder EU Richtlijn (EU) 2019/771 met 2 jaar wettelijke conformiteitsgarantie tegen fabricage- en materiaalfouten. 30 dagen herroepingsrecht (Richtlijn 2011/83/EU). Conform EU Textielverordening nr. 1007/2011 en gifvrije REACH-normen (EG 1907/2006).",
    },
    cart: {
      title: "WINKELMAND",
      emptyTitle: "UW WINKELMAND IS LEEG.",
      emptySubtitle: "Ontdek tijdloze silhouetten geïnspireerd door Centraal-Aziatisch zijde-erfgoed.",
      continueShopping: "VERDER WINKELEN",
      subtotal: "SUBTOTAAL",
      taxesNote: "Gratis 30 dagen retour in de EU.",
      viewBag: "BEKIJK MAND",
      checkout: "AFREKENEN",
      addMoreForFreeShipping: "Voeg nog {amount} toe voor gratis verzending",
      freeShippingUnlocked: "Gratis verzending in Europa ontgrendeld",
      remove: "Verwijderen",
      itemsCount: "artikelen",
    },
    checkout: {
      title: "AFREKENEN",
      tag: "BESTELLING VERZENDING",
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
      expressCourier: "SPOEDVERZENDING VOORRANG",
      expressNote: "1–2 werkdagen (DHL Express)",
      complimentary: "GRATIS",
      paymentMethod: "04 • BETAALMETHODE",
      creditCard: "Creditcard",
      ideal: "iDEAL / SEPA",
      applePay: "Apple Pay",
      securityNote: "Beveiligd met 256-bit TLS-encryptie. Onmiddellijke verzending vanuit ons Europees distributiecentrum.",
      placeOrder: "BESTELLING PLAATSEN",
      processingOrder: "BESTELLING WORDT VERWERKT...",
      orderSummary: "OVERZICHT BESTELLING",
      inclVat: "INCL. 21% BTW",
      estimatedTotal: "TOTAALBEDRAG",
      orderConfirmed: "BESTELLING BEVESTIGD",
      thankYou: "HARTELIJK DANK VOOR UW BESTELLING",
      confirmationDispatched: "Uw order is doorgestuurd naar ons Amsterdamse team. Een bevestigingsbewijs is verzonden naar uw e-mailadres.",
      viewInAccount: "BEKIJK IN MIJN ACCOUNT",
      continueBrowsing: "VERDER WINKELEN",
    },
    account: {
      portalTag: "CLIENT PORTAL",
      clientAccess: "KLANTENTOEGANG",
      signInPrompt: "Log in met uw Google- of YUPEK-account om uw bestellingen te volgen, bezorgadressen te beheren en privécollecties te bekijken.",
      continueGoogle: "DOORGAAN MET GOOGLE",
      signInEmail: "INLOGGEN MET E-MAIL",
      demoSession: "Directe Demo Toegang",
      vipClientDemo: "Inloggen als VIP Klant",
      adminDemo: "Inloggen als Beheerder",
      vipMemberTag: "YUPEK Circle VIP",
      adminMemberTag: "Winkelbeheerder",
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
      conciergeTitle: "YUPEK CLIËNT CONCIËRGE",
      conciergeDesc: "Als geregistreerde cliënt heeft u directe voorrang bij ons team. Wij assisteren bij maatadvies, productdetails en bestellingen.",
      whatsAppConciergeBtn: "WhatsApp Privé Conciërge",
      bookAppointmentBtn: "Contact Conciërge",
    },
    auth: {
      brandTag: "YUPEK",
      clientAccessTitle: "KLANTENTOEGANG",
      createAccountTitle: "ACCOUNT AANMAKEN",
      subtitle: "Ervaar persoonlijke orderopvolging, bewaarde favorieten en exclusieve previews.",
      continueGoogle: "DOORGAAN MET GOOGLE",
      orViaEmail: "OF MET E-MAIL",
      signInTab: "INLOGGEN",
      registerTab: "REGISTREREN",
      fullNameLabel: "Volledige Naam",
      emailLabel: "E-mailadres",
      passwordLabel: "Wachtwoord",
      authenticating: "VERIFIËREN...",
      enterStoreBtn: "WINKEL BETREDEN",
      createProfileBtn: "PROFIEL AANMAKEN",
      instantPreview: "Snelle Demo Toegang",
      vipDemoBtn: "VIP Klant Demo",
      adminDemoBtn: "Beheerder Demo",
    },
    contact: {
      tag: "DIGITALE KLANTENSERVICE",
      title: "CLIËNT CONCIËRGE",
      subtitle: "Of u nu een vraag heeft over maten, productdetails, een bestelling of internationale bezorging: ons cliënt conciërgeteam staat voor u klaar.\n\nVoor specifieke productvragen of stylingadvies kunnen klanten rechtstreeks contact met ons opnemen via e-mail of ons contactformulier.",
      formTitle: "STUUR EEN BERICHT",
      formSubtitle: "Ons cliënt conciërgeteam reageert doorgaans binnen twee uur tijdens klantenservice-uren.",
      fullName: "Volledige Naam *",
      email: "E-mailadres *",
      phone: "Telefoonnummer (Optioneel)",
      subject: "Onderwerp van het bericht",
      message: "Bericht & details van uw aanvraag *",
      transmitting: "BERICHT VERZENDEN...",
      sendInquiryBtn: "VERSTUUR AANVRAAG",
      thankYouTitle: "Hartelijk dank voor uw bericht",
      thankYouDesc: "Uw aanvraag is geregistreerd bij de cliënt conciërge. U ontvangt spoedig een bevestiging per e-mail.",
      sendAnother: "Nog een bericht versturen",
      headquartersTag: "DIGITALE CLIËNT CONCIËRGE",
      studioTitle: "YUPEK CLIËNT CONCIËRGE",
      conciergeEmail: "E-MAIL",
      telephoneLine: "TELEFOON",
      visitingHours: "KLANTENSERVICE",
      directWhatsAppBtn: "CONTACT KLANTENSERVICE",
      studioTour: "Klantenservice",
      cardTitle: "YUPEK CLIËNT CONCIËRGE",
      cardDescription: "Ons cliënt conciërgeteam staat klaar om u te helpen met bestellingen, maten, productdetails, verzending en algemene vragen.",
      subjects: {
        productInfo: "Productinformatie",
        sizingFit: "Maatadvies & Pasvorm",
        orderSupport: "Ondersteuning bij Bestelling",
        shippingDelivery: "Verzending & Bezorging",
        returnsExchanges: "Retourneren & Ruilen",
        wholesale: "Groothandel / Samenwerking",
        generalEnquiry: "Algemene Vraag",
      },
    },
    about: {
      manifestoTag: "MERK MANIFEST",
      title: "HET VERHAAL\nVAN YUPEK",
      bornMeeting: "YUPEK ontstond uit een ontmoeting van twee werelden.",
      bornBody: "Centraal-Azië brengt duizenden jaren aan geweven textiel, zijderoute-geschiedenis en tactiele poëzie. Modern Europa biedt strakke silhouetten, ingetogen elegantie en dagelijkse draagbaarheid.",
      taglineBanner: "OOSTERSE WORTELS • EUROPESE VORM",
      craftFilm: "Vakmanschapsfilm",
      experienceCapsule: "ERVAAR DE CAPSULE",
      experienceSubtitle: "Gelimiteerde productie gebouwd voor een lange levensduur.",
      shopCollectionBtn: "SHOP DE COLLECTIE",
      visitStudioBtn: "CLIËNT CONCIËRGE",
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
          desc: "Een groeiende collectie van tijdloze garderobestukken, met uiterste precisie vervaardigd en geworteld in een cultuur die gedragen moet worden, en niet enkel in vitrines bewaard.",
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
          category: "COLLECTION",
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
      shippingPolicy: "VERZENDBELEID",
      returns30Days: "30 DAGEN RETOURNEREN",
      euCompliance: "EU CONSUMENTENRECHT",
      cookiePreferences: "COOKIEVOORKEUREN",
      supportService: "KLANTENSERVICE",
      contactSupport: "Contact Klantenservice",
      orderHelp: "Hulp bij Bestelling",
      needHelp: "Hulp nodig?",
      needHelpDesc: "Neem contact op met onze klantenservice voor persoonlijke assistentie.",
    },
    cookies: {
      bannerTitle: "YUPEK gebruikt cookies",
      bannerDescription:
        "Wij gebruiken essentiële cookies om YUPEK naar behoren te laten functioneren. Met uw toestemming kunnen wij ook analytische en marketingcookies gebruiken om uw ervaring te verbeteren en te begrijpen hoe onze website wordt gebruikt.",
      acceptAll: "ALLES ACCEPTEREN",
      rejectNonEssential: "NIET-ESSENTIEEL WEIGEREN",
      cookieSettings: "COOKIE-INSTELLINGEN",
      savePreferences: "VOORKEUREN OPSLAAN",
      modalTitle: "Cookie-instellingen",
      modalSubtitle:
        "Beheer uw cookievoorkeuren. Essentiële cookies zijn vereist voor het functioneren van de website.",
      essentialTitle: "Essentieel",
      essentialStatus: "Altijd actief",
      essentialDesc: "Vereist voor het functioneren van de website.",
      analyticsTitle: "Analytisch",
      analyticsStatusOff: "Standaard uit",
      analyticsStatusOn: "Actief",
      analyticsDesc: "Helpt ons te begrijpen hoe bezoekers YUPEK gebruiken en om de website te verbeteren.",
      marketingTitle: "Marketing",
      marketingStatusOff: "Standaard uit",
      marketingStatusOn: "Actief",
      marketingDesc: "Wordt gebruikt om marketing en advertenties te meten en te verbeteren.",
    },
    whatsapp: {
      tooltip: "Conciërge Online",
      ariaLabel: "Chat op WhatsApp met de YUPEK Conciërge",
    },
    newsletter: {
      tag: "MEDEDELING",
      title: "WORD LID VAN DE YUPEK CIRCLE",
      subtitle: "Leden ontvangen exclusieve previews van seizoenscapsules, speciale aankondigingen en textielessays.",
      emailPlaceholder: "UW E-MAILADRES",
      subscribeBtn: "AANMELDEN",
      thankYou: "WELKOM BIJ DE YUPEK CIRCLE",
      privacyNote: "Strikt vertrouwelijk. Geen spam, op elk moment opzegbaar.",
    },
    searchOverlay: {
      title: "ZOEKEN IN YUPEK COLLECTIE",
      placeholder: "T-shirt, Overhemd, Zijde, Spijkerbroek...",
      noResults: "GEEN STUKS GEVONDEN VOOR",
      closeAria: "Zoekvenster sluiten",
    },
    returnsPage: {
      heroTag: "CONSUMENTENRECHTEN • WETTELIJKE BESCHERMING",
      heroTitle: "RETOURBELEID &\nEU REGELGEVING",
      heroSubtitle: "Volledige transparantie over uw 30 dagen herroepingsrecht, 2 jaar wettelijke conformiteitsgarantie en Europese productveiligheidsnormen.",
      policyHighlights: [
        {
          badge: "30 DAGEN",
          title: "Verlengd Herroepingsrecht",
          desc: "Wettelijk EU-herroepingsrecht van 14 dagen (Richtlijn 2011/83/EU) verlengd tot 30 kalenderdagen door YUPEK.",
        },
        {
          badge: "2 JAAR",
          title: "Wettelijke Conformiteitsgarantie",
          desc: "Volledige bescherming tegen fabricage- en materiaalfouten onder Richtlijn (EU) 2019/771 en het Nederlands Burgerlijk Wetboek Boek 7.",
        },
        {
          badge: "100% EU",
          title: "Gecertificeerde Textielconformiteit",
          desc: "Nauwkeurige vezelaanduiding volgens Verordening (EU) nr. 1007/2011 en gifvrije REACH-veiligheid (Verordening EG 1907/2006).",
        },
        {
          badge: "SNELLE TERUGBETALING",
          title: "Snelle Vergoeding",
          desc: "Volledige terugbetaling binnen 14 kalenderdagen via uw oorspronkelijke betaalmethode na ontvangst en inspectie van het artikel.",
        },
      ],
      withdrawalTitle: "30 DAGEN WETTELIJK HERROEPINGSRECHT",
      withdrawalSubtitle: "EU Richtlijn 2011/83/EU & YUPEK Standaard",
      withdrawalBody1: "Op grond van Richtlijn 2011/83/EU van de Europese Unie betreffende consumentenrechten heeft u het wettelijke recht om binnen een termijn van 14 dagen zonder opgave van redenen de overeenkomst te herroepen. Bij YUPEK verlengen wij deze periode naar 30 kalenderdagen, ingaande op de dag waarop u of een door u aangewezen derde het artikel fysiek in bezit heeft gekregen.",
      withdrawalBody2: "Om uw herroepingsrecht uit te oefenen, kunt u eenvoudig contact opnemen via uw account, e-mail (daniyarow16@gmail.com) of ons contactportaal. Als u de gehele bestelling herroept, vergoeden wij alle ontvangen betalingen, inclusief de initiële standaard bezorgkosten, uiterlijk binnen 14 dagen na ontvangst van de geretourneerde goederen of het bewijs van retourverzending.",
      conditionsTitle: "Retourvoorwaarden & Integriteitscriteria",
      conditions: [
        "Kledingstukken moeten ongedragen, ongewassen, ongewijzigd en onbeschadigd worden geretourneerd.",
        "Alle originele YUPEK textiellabels, beveiligingszegels en labels moeten intact en onbeschadigd aanwezig zijn.",
        "Artikelen moeten worden geretourneerd in de originele beschermende stofzakken en luxe originele verpakking.",
        "Het passen van kleding om de maat en pasvorm te beoordelen—zoals gebruikelijk in een fysieke boetiek—is uiteraard toegestaan; het dragen van artikelen buitenshuis ontbindt het recht op herroeping.",
      ],
      guaranteeTitle: "2 JAAR WETTELIJKE CONFORMITEITSGARANTIE",
      guaranteeSubtitle: "Richtlijn (EU) 2019/771 & Nederlands Consumentenrecht",
      guaranteeBody1: "Elk kledingstuk aangeschaft bij YUPEK is beschermd door de verplichte wettelijke garantie van 2 jaar volgens Richtlijn (EU) 2019/771 betreffende de verkoop van goederen en Boek 7 van het Nederlands Burgerlijk Wetboek.",
      guaranteeBody2: "Mocht een artikel een gebrek aan overeenstemming vertonen—zoals een onverwachte naadbreuk, rits- of knoopdefect, materiaalonvolkomenheid die niet het gevolg is van verkeerd wassen of onderhoud—dan heeft u kosteloos recht op herstel of vervanging. Indien herstel of vervanging onmogelijk of onevenredig is, heeft u recht op een passende prijsvermindering of volledige ontbinding met terugbetaling.",
      euRegulationsTitle: "EU PRODUCTREGELGEVING & VEILIGHEIDSCONFORMITEIT",
      euRegulationsSubtitle: "Strikte naleving van Europese normen voor gezondheid, milieu en consumentenbescherming",
      regulationsList: [
        {
          directive: "Verordening (EU) nr. 1007/2011",
          title: "Textielvezelbenamingen & Etikettering",
          scope: "Vezelzuiverheid & Transparantie",
          description: "Verplichte 100% openbaarmaking van alle textielvezels naar gewichtspercentage (bijv. 100% Moerbeizijde, 100% Biologisch Katoen). Niet-textiele delen van dierlijke oorsprong (zoals parelmoeren knopen) worden conform EU-wetgeving uitdrukkelijk vermeld.",
        },
        {
          directive: "Verordening (EG) nr. 1907/2006",
          title: "REACH Chemische Veiligheid & Niet-Giftigheid",
          scope: "Gezondheid & Milieuveiligheid",
          description: "Alle textielstoffen, natuurlijke verfstoffen en metalen fournituren voldoen aan de strenge Europese REACH-verordening. Gegarandeerd vrij van schadelijke azokleurstoffen, zware metalen, formaldehyde en toxische PFAS.",
        },
        {
          directive: "Verordening (EU) 2023/988 / GPSR",
          title: "Algemene Productveiligheid & Traceerbaarheid",
          scope: "Consumentenbescherming",
          description: "Artikelen zijn ontworpen en vervaardigd volgens de hoogste Europese kwaliteits- en veiligheidseisen. Verantwoordelijke marktdeelnemer in de Europese Unie: YUPEK (Cliënt Conciërge: daniyarov16@gmail.com).",
        },
        {
          directive: "Richtlijn 2000/31/EG & AVG/GDPR",
          title: "Gegevensbescherming & Eerlijke Handel",
          scope: "Privacy & Consumentenrecht",
          description: "Uw persoonsgegevens en bestellingen worden behandeld volgens de strengste Europese Algemene Verordening Gegevensbescherming (AVG/GDPR) met nul commerciële marketingdeling met derden. Gegevens worden uitsluitend gedeeld met noodzakelijke productie-, betaal- en bezorgpartners om uw aankoop te verwerken.",
        },
      ],
      stepsTitle: "HOE EEN RETOUR AAN TE MELDEN",
      stepsSubtitle: "Eenvoudig 4-stappen proces",
      steps: [
        {
          stepNumber: "01",
          title: "Neem Contact Op Met Conciërge",
          desc: "Meld uw retour via uw account, e-mail of ons contactformulier onder vermelding van uw bestelnummer (bijv. YPK-2026-XXXX).",
        },
        {
          stepNumber: "02",
          title: "Inpakken in Originele Doos",
          desc: "Plaats het kledingstuk netjes in de originele beschermende stofzak en verzenddoos met alle verzegelingen intact.",
        },
        {
          stepNumber: "03",
          title: "Verzending via Koerier",
          desc: "Breng het door onze conciërge verstrekte retourlabel aan en geef het pakket af bij een koerierspunt (PostNL, DHL, UPS).",
        },
        {
          stepNumber: "04",
          title: "Inspectie & Terugbetaling",
          desc: "Na ontvangst controleren onze meester-kleermakers het artikel binnen 48 uur. Het aankoopbedrag wordt direct gecrediteerd via uw betaalmethode.",
        },
      ],
      addressTitle: "RETOURVERWERKING",
      addressSubtitle: "Digitale conciërge retourprocedure",
      addressLines: [
        "YUPEK Retouren & Kwaliteitscontrole",
        "Retouren worden verwerkt via voorgefrankeerde retourlabels.",
        "Vraag eenvoudig uw kosteloze retourlabel aan via onze cliënt conciërge.",
        "Klantenservice: daniyarov16@gmail.com",
      ],
      conciergeTitle: "PERSOONLIJKE ONDERSTEUNING NODIG?",
      conciergeSubtitle: "Onze cliënt conciërge staat voor u klaar bij maatruilingen, retourlabels of vragen over EU-rechten.",
      contactEmailBtn: "E-MAIL CONCIËRGE",
      contactWhatsAppBtn: "KLANTENSERVICE",
      odrTitle: "EUROPESE ONLINE GESCHILLENBESLECHTING (ODR)",
      odrDesc: "Overeenkomstig artikel 14 lid 1 van Verordening (EU) nr. 524/2013 biedt de Europese Commissie een platform voor online geschillenbeslechting (ODR) voor buitengerechtelijke beslechting van consumentengeschillen.",
      odrPlatformBtn: "BEZOEK EU ODR PLATFORM",
    },
    a11y: {
      floatingButtonLabel: "Toegankelijkheid & Leesgereedschap",
      floatingTooltip: "Toegankelijkheid & Kleurenblindheid",
      drawerTitle: "TOEGANKELIJKHEID & LEESGEMAK",
      drawerSubtitle: "Spraakweergave, dyslexie-vriendelijke typografie & kleurcontrast voor elk gezichtsvermogen",
      screenReaderTitle: "AUDIO VOORLEZER (TEXT-TO-SPEECH)",
      screenReaderDesc: "Luister naar de huidige pagina, essays of productbeschrijvingen met natuurlijke spraaksynthese.",
      readPageBtn: "PAGINA VOORLEZEN",
      readSelectionBtn: "GESELECTEERDE TEKST VOORLEZEN",
      stopSpeechBtn: "STOP VOORLEZEN",
      pauseSpeechBtn: "PAUZEREN",
      resumeSpeechBtn: "HERVATTEN",
      speakingNow: "Bezig met voorlezen...",
      speechRateLabel: "LEESSNELHEID",
      rateSlow: "0.8x (Rustig)",
      rateNormal: "1.0x (Standaard)",
      rateFast: "1.2x (Vlot)",
      colorBlindTitle: "KLEURENBLINDHEID & CONTRASTMODI",
      colorBlindDesc: "Wetenschappelijk gekalibreerde daltonisatie-filters en hoog contrast voor kleurenblindheid.",
      colorModes: {
        normal: {
          name: "Standaard Palet",
          desc: "Oorspronkelijk geselecteerd kleurenpalet van Turkmeense zijde en Europese vorm.",
        },
        highContrast: {
          name: "Hoog Contrast (WCAG AAA)",
          desc: "Maximaal contrast met diepzwarte achtergrond, helder wit en goud.",
        },
        deuteranopia: {
          name: "Deuteranopie Filter",
          desc: "Groen-zwak aanpassing: voorkomt verwarring tussen rood en groen.",
        },
        protanopia: {
          name: "Protanopie Filter",
          desc: "Rood-zwak aanpassing: verbetert contrast en verschuift roodtinten naar het zichtbare spectrum.",
        },
        tritanopia: {
          name: "Tritanopie Filter",
          desc: "Blauw-geel aanpassing: verhoogd contrast tussen blauw- en groentinten.",
        },
        monochrome: {
          name: "Monochromie / Grijstinten",
          desc: "Zuiver hoog-contrast grijstinten voor totale kleurenblindheid (achromatopsie).",
        },
      },
      readingTitle: "LEESHULPMIDDELEN & TYPOGRAFIE",
      textSizeLabel: "TEKSTGROOTTE",
      textNormal: "Standaard (100%)",
      textLarge: "Groot (115%)",
      textXLarge: "Extra Groot (130%)",
      dyslexiaFontLabel: "Dyslexie-Vriendelijke Typografie",
      dyslexiaFontDesc: "Goed leesbare lettervormen, bredere letterafstand en ruimere regelhoogte.",
      readingGuideLabel: "Leesliniaal / Focusbalk",
      readingGuideDesc: "Horizontale focusbalk die de cursor volgt om comfortabel regel voor regel te lezen.",
      highlightLinksLabel: "Onderstreep & Accentueer Links",
      highlightLinksDesc: "Zorgt ervoor dat klikbare koppelingen altijd duidelijk zichtbaar zijn, onafhankelijk van kleur.",
      motionTitle: "BEWEGING & VISUEEL COMFORT",
      pauseAnimationsLabel: "Pauzeer Animaties & Autoplay",
      pauseAnimationsDesc: "Schakelt automatische videoweergave, tickers en vloeiende animaties uit.",
      resetAllBtn: "HERSTEL NAAR STANDAARDINSTELLINGEN",
      savedNote: "Uw voorkeuren worden automatisch bewaard tijdens uw bezoek.",
      closeBtn: "Sluit Toegankelijkheidsmenu",
    },
  },
};
