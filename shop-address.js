/* PickDee Shop — Địa chỉ Việt Nam sau sáp nhập (1/7/2025), dùng chung cho Tạo đơn + Thả ảnh đơn.
   - load(): danh sách tỉnh/xã mới (vn-address-2025.json 97KB, lỗi thì lấy GitHub).
   - resolveAddress(text): "số nhà, xã cũ, huyện cũ, tỉnh cũ" → tỉnh + xã MỚI (provinces.open-api.vn, miễn phí).
   Dùng: await PDAddress.load(); const a = await PDAddress.resolveAddress("..."); */
(function () {
  "use strict";

  const ADDRESS_PROVINCE_URL =
    "https://raw.githubusercontent.com/open-admin-data/vietnam-administrative-divisions/main/data/all-province.json";
  const ADDRESS_WARD_URL =
    "https://raw.githubusercontent.com/open-admin-data/vietnam-administrative-divisions/main/data/all-ward.json";

  let addressProvinces = [];
  let addressWards = [];
  let loadP = null;

  function addressName(item) {
    return (
      item?.name?.local
      ||
      item?.name
      ||
      ""
    );
  }

  function load() {
    if (!loadP) {
      loadP = (async function () {
        try {
          const localResult = await fetch("/vn-address-2025.json?v=20261016");
          if (localResult.ok) {
            const compact = await localResult.json();
            addressProvinces = compact.p.map(([id, name]) => ({ id, name: { local: name } }));
            addressWards = compact.w.map(([id, name, parentId]) => ({ id, name: { local: name }, parent: { id: parentId } }));
            return;
          }
        }
        catch (_) {}
        const [provinceResult, wardResult] = await Promise.all([fetch(ADDRESS_PROVINCE_URL), fetch(ADDRESS_WARD_URL)]);
        if (!provinceResult.ok || !wardResult.ok) {
          throw new Error("Không tải được danh sách tỉnh/phường.");
        }
        addressProvinces = await provinceResult.json();
        addressWards = await wardResult.json();
      })();
      loadP.catch(function () { loadP = null; });
    }
    return loadP;
  }

  function plain(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }


  // Tỉnh cũ → tỉnh mới (Nghị quyết 202/2025/QH15, hiệu lực 1/7/2025)
  const OLD_PROVINCE_TO_NEW = {
    "ha giang": "Tuyên Quang", "yen bai": "Lào Cai", "bac kan": "Thái Nguyên",
    "vinh phuc": "Phú Thọ", "hoa binh": "Phú Thọ", "bac giang": "Bắc Ninh",
    "thai binh": "Hưng Yên", "hai duong": "Hải Phòng", "ha nam": "Ninh Bình",
    "nam dinh": "Ninh Bình", "quang binh": "Quảng Trị", "thua thien hue": "Huế",
    "quang nam": "Đà Nẵng", "kon tum": "Quảng Ngãi", "binh dinh": "Gia Lai",
    "ninh thuan": "Khánh Hòa", "dak nong": "Lâm Đồng", "binh thuan": "Lâm Đồng",
    "phu yen": "Đắk Lắk", "binh duong": "Hồ Chí Minh", "ba ria vung tau": "Hồ Chí Minh",
    "ba ria - vung tau": "Hồ Chí Minh", "vung tau": "Hồ Chí Minh",
    "binh phuoc": "Đồng Nai", "long an": "Tây Ninh", "soc trang": "Cần Thơ",
    "hau giang": "Cần Thơ", "ben tre": "Vĩnh Long", "tra vinh": "Vĩnh Long",
    "tien giang": "Đồng Tháp", "bac lieu": "Cà Mau", "kien giang": "An Giang",
    "ho chi minh": "Hồ Chí Minh", "hcm": "Hồ Chí Minh", "sai gon": "Hồ Chí Minh",
    "ha noi": "Hà Nội", "hn": "Hà Nội", "hue": "Huế"
  };


  function stripAdminPrefix(value) {
    return plain(value)
      .replace(/^(tinh|thanh pho|tp\.?|t\.p\.?|thi tran|tt\.?|thi xa|tx\.?|phuong|p\.|xa|x\.|quan|q\.|huyen|h\.)\s*/, "")
      .trim();
  }


  function findProvince(segment) {

    const key = stripAdminPrefix(segment);

    if (!key) {
      return null;
    }

    const direct =
      addressProvinces.find(
        p => plain(addressName(p)) === key
      );

    if (direct) {
      return { province: direct, isOld: false };
    }

    const newName =
      OLD_PROVINCE_TO_NEW[key];

    if (newName) {
      const mapped =
        addressProvinces.find(
          p => addressName(p) === newName
        );
      if (mapped) {
        return { province: mapped, isOld: !["ho chi minh", "hcm", "sai gon", "ha noi", "hn", "hue"].includes(key) };
      }
    }

    return null;

  }


  const WARD_RE = /^(xa|phuong|thi tran|tt\.?|p\.|x\.)(\s|$)/;
  const DISTRICT_RE = /^(huyen|quan|thi xa|thanh pho|tp\.?|tx\.?|h\.|q\.)(\s|$)/;


  function splitAddress(text) {

    const parts =
      String(text || "")
        .split(/[,\n]/)
        .map(x => x.trim())
        .filter(Boolean);

    let provinceInfo = null;
    let provinceIndex = -1;

    for (let i = parts.length - 1; i >= 0; i--) {
      const found = findProvince(parts[i]);
      if (found) {
        provinceInfo = found;
        provinceIndex = i;
        break;
      }
    }

    const before =
      provinceIndex >= 0
        ? parts.slice(0, provinceIndex)
        : parts;

    let wardIndex = -1;
    let districtIndex = -1;

    before.forEach(
      (part, i) => {
        const p = plain(part);
        if (WARD_RE.test(p) && wardIndex < 0) wardIndex = i;
        if (DISTRICT_RE.test(p) && i > wardIndex && wardIndex >= 0) districtIndex = i;
        else if (DISTRICT_RE.test(p) && wardIndex < 0) districtIndex = i;
      }
    );

    const streetEnd =
      [wardIndex, districtIndex]
        .filter(i => i >= 0)
        .reduce((a, b) => Math.min(a, b), before.length);

    return {
      street: before.slice(0, streetEnd).join(", "),
      ward: wardIndex >= 0 ? before[wardIndex] : "",
      district: districtIndex >= 0 ? before[districtIndex] : "",
      provinceInfo
    };

  }


  function wardsOfProvince(provinceId) {
    return addressWards.filter(
      w => String(w?.parent?.id) === String(provinceId)
    );
  }


  function normalizeWardQuery(ward) {
    return String(ward || "")
      .replace(/^\s*(TT\.?|tt\.?)\s*/, "Thị trấn ")
      .replace(/^\s*(P\.|p\.)\s*/, "Phường ")
      .replace(/^\s*(X\.|x\.)\s*/, "Xã ")
      .trim();
  }


  /*
    Nhiều xã trùng tên (vd "Phường 1"): tra mã xã cũ theo quận/huyện cũ
    (API v1 dữ liệu trước sáp nhập) rồi đổi sang xã mới theo mã.
  */

  async function pickByLegacyDistrict(wardText, districtText, candidates) {

    try {

      const base = "https://provinces.open-api.vn/api";

      const districts =
        await (await fetch(base + "/v1/d/search/?q=" + encodeURIComponent(districtText.replace(/^(TP\.?|Tp\.?|tp\.?)\s*/, "Thành phố ").trim()))).json();

      const wardQuery =
        normalizeWardQuery(wardText);

      const hits = [];

      for (const d of (Array.isArray(districts) ? districts : []).slice(0, 5)) {

        const wards =
          await (await fetch(base + "/v1/w/search/?q=" + encodeURIComponent(wardQuery) + "&d=" + d.code)).json();

        for (const w of (Array.isArray(wards) ? wards : []).filter(x => plain(x.name) === plain(wardQuery)).slice(0, 3)) {

          const mapped =
            await (await fetch(base + "/v2/w/from-legacy/?legacy_code=" + w.code)).json();

          (Array.isArray(mapped) ? mapped : []).forEach(
            m => {
              const hit = candidates.find(c => String(c.id).padStart(5, "0") === String(m?.ward?.code).padStart(5, "0"));
              if (hit && !hits.includes(hit)) {
                hits.push(hit);
              }
            }
          );

        }

      }

      return hits.length === 1 ? hits[0] : null;

    }
    catch (_) {
      return null;
    }

  }


  async function resolveAddress(text) {

    const parsed = splitAddress(text);

    const result = {
      street: parsed.street,
      provinceName: "",
      provinceId: "",
      wardName: "",
      isOld: false,
      hint: ""
    };

    if (!parsed.provinceInfo) {
      result.hint = "Chưa nhận ra tỉnh/thành – chọn tay giúp em.";
      return result;
    }

    const province = parsed.provinceInfo.province;

    result.provinceName = addressName(province);
    result.provinceId = province.id;
    result.isOld = parsed.provinceInfo.isOld || Boolean(parsed.district);

    const pool = wardsOfProvince(province.id);
    const wardKey = stripAdminPrefix(parsed.ward);
    const districtKey = stripAdminPrefix(parsed.district);

    // Địa chỉ mới: xã/phường có sẵn trong tỉnh mới, không có huyện
    if (!result.isOld && wardKey) {
      const hit = pool.find(w => plain(addressName(w)) === wardKey);
      if (hit) {
        result.wardName = addressName(hit);
        return result;
      }
    }

    if (!parsed.ward) {
      result.hint = "Chưa nhận ra phường/xã – chọn tay giúp em.";
      return result;
    }

    // Địa chỉ cũ → tra xã mới
    try {

      const url =
        "https://provinces.open-api.vn/api/v2/w/from-legacy/?legacy_name="
        + encodeURIComponent(normalizeWardQuery(parsed.ward));

      const response = await fetch(url);
      const list = response.ok ? await response.json() : [];

      const candidates =
        (Array.isArray(list) ? list : [])
          .map(x => x.ward)
          .filter(w => w && String(w.province_code).padStart(2, "0") === String(province.id).padStart(2, "0"))
          // mã xã trong web có số 0 đầu ("04273"), API trả 4273
          .map(w => pool.find(p => String(p.id).padStart(5, "0") === String(w.code).padStart(5, "0")))
          .filter(Boolean)
          .filter((w, i, arr) => arr.indexOf(w) === i);

      let pick = null;

      if (candidates.length === 1) {
        pick = candidates[0];
      }
      else if (candidates.length > 1) {
        pick =
          candidates.find(w => stripAdminPrefix(addressName(w)) === wardKey)
          ||
          candidates.find(w => districtKey && plain(addressName(w)).includes(districtKey))
          ||
          null;

        if (!pick && parsed.district) {
          pick = await pickByLegacyDistrict(parsed.ward, parsed.district, candidates);
        }

        if (!pick) {
          result.hint =
            "Có nhiều xã/phường trùng tên: "
            + candidates.map(addressName).join(" / ")
            + " – chọn đúng giúp em.";
        }
      }

      if (pick) {
        result.wardName = addressName(pick);
      }
      else if (!result.hint) {
        result.hint = "Không tra được xã/phường mới – chọn tay giúp em.";
      }

    }
    catch (_) {
      result.hint = "Không tra được địa chỉ mới (mạng) – chọn tay giúp em.";
    }

    return result;

  }

  // Địa chỉ AI tách sẵn (có tiền tố Phường/Xã, Quận/Huyện/TP, Tỉnh) → thử trước, không ra xã thì thử chữ gốc
  async function resolveParsed(addressText, parts) {
    const ap = parts || {};
    const structured = [ap.street, ap.ward, ap.district, ap.province].filter(Boolean).join(", ");
    let addr = await resolveAddress(ap.province ? structured : addressText);
    if (!addr.wardName && ap.province) {
      const alt = await resolveAddress(addressText);
      if (alt.wardName) addr = alt;
    }
    return addr;
  }

  window.PDAddress = {
    load: load,
    provinces: function () { return addressProvinces; },
    wards: function () { return addressWards; },
    addressName: addressName,
    plain: plain,
    stripAdminPrefix: stripAdminPrefix,
    findProvince: findProvince,
    splitAddress: splitAddress,
    wardsOfProvince: wardsOfProvince,
    resolveAddress: resolveAddress,
    resolveParsed: resolveParsed
  };
})();
