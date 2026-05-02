(function () {
  var input = document.getElementById("nikInput");
  var decodeBtn = document.getElementById("decodeBtn");
  var copyBtn = document.getElementById("copyBtn");
  var statusEl = document.getElementById("status");
  var charCountEl = document.getElementById("charCount");
  var form = document.getElementById("nikForm");

  var outKodeWilayah = document.getElementById("outKodeWilayah");
  var outProvinsi = document.getElementById("outProvinsi");
  var outKab = document.getElementById("outKab");
  var outKec = document.getElementById("outKec");
  var outLahir = document.getElementById("outLahir");
  var outGender = document.getElementById("outGender");
  var outUrut = document.getElementById("outUrut");

  var lastResult = null;

  var wilayahData = window.WILAYAH_DATA || null;
  var wilayahMaps = normalizeWilayah(wilayahData);
  var wilayahCount = wilayahMaps.count;

  function setButtonDisabled(button, isDisabled) {
    button.disabled = isDisabled;
    button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
  }

  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.setAttribute("data-loading", "true");
      button.setAttribute("aria-disabled", "true");
      return;
    }
    button.removeAttribute("data-loading");
    button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
  }

  function normalizeWilayah(data) {
    var provMap = Object.create(null);
    var kabMap = Object.create(null);
    var kecMap = Object.create(null);

    if (data && typeof data === "object") {
      if (data.provinsi && typeof data.provinsi === "object") {
        provMap = data.provinsi;
      }
      if (data.kabkota && typeof data.kabkota === "object") {
        kabMap = data.kabkota;
      }
      if (data.kecamatan && typeof data.kecamatan === "object") {
        kecMap = data.kecamatan;
      }

      if (!Object.keys(provMap).length && data.province && typeof data.province === "object") {
        provMap = data.province;
      }

      if (!Object.keys(kabMap).length) {
        var altKab = data.kabupatenKota || data.kabupaten_kota;
        if (altKab && typeof altKab === "object") {
          kabMap = altKab;
        }
      }

      if (!Object.keys(kecMap).length) {
        var altKec = data.kec || data.kecamatanMap;
        if (altKec && typeof altKec === "object") {
          kecMap = altKec;
        }
      }
    }

    var kecCount = 0;
    if (kecMap && typeof kecMap === "object") {
      kecCount = Object.keys(kecMap).length;
    }

    var count = kecCount;
    if (!count && kabMap && typeof kabMap === "object") {
      count = Object.keys(kabMap).length;
    }
    if (!count && provMap && typeof provMap === "object") {
      count = Object.keys(provMap).length;
    }

    return {
      provMap: provMap,
      kabMap: kabMap,
      kecMap: kecMap,
      count: count,
      kecCount: kecCount,
    };
  }

  function nameFrom(obj) {
    if (!obj) {
      return null;
    }
    if (typeof obj === "string") {
      return obj;
    }
    return (
      obj.nama ||
      obj.name ||
      obj.kabkota ||
      obj.kabupatenKota ||
      obj.kabupaten_kota ||
      obj.kabupaten ||
      obj.kota ||
      null
    );
  }

  function resolveProvinsiFromCode(code) {
    if (!code) {
      return null;
    }
    if (typeof code === "string" && /^\d{2}$/.test(code)) {
      return wilayahMaps.provMap[code] || null;
    }
    return code;
  }

  function resolveWilayah(kodeWilayah) {
    var provCode = kodeWilayah.slice(0, 2);
    var kabCode = kodeWilayah.slice(0, 4);

    var provName = wilayahMaps.provMap[provCode] || null;
    var kabObj = wilayahMaps.kabMap[kabCode] || null;
    var kabName = nameFrom(kabObj);

    var kecObj = wilayahMaps.kecMap[kodeWilayah] || null;
    var kecName = null;

    if (kecObj) {
      if (typeof kecObj === "string") {
        kecName = kecObj;
      } else if (typeof kecObj === "object") {
        kecName = kecObj.kecamatan || kecObj.nama || kecObj.name || null;

        var kabFromKec =
          kecObj.kabkota ||
          kecObj.kabupatenKota ||
          kecObj.kabupaten_kota ||
          kecObj.kabupaten ||
          kecObj.kota ||
          null;
        if (kabFromKec) {
          kabName = kabFromKec;
        }

        var provFromKec = kecObj.provinsi || kecObj.province || kecObj.kode_provinsi || null;
        if (provFromKec) {
          provName = resolveProvinsiFromCode(provFromKec) || provName;
        }
      }
    }

    if (!provName && kabObj && typeof kabObj === "object") {
      var provFromKab = kabObj.provinsi || kabObj.province || kabObj.kode_provinsi || null;
      if (provFromKab) {
        provName = resolveProvinsiFromCode(provFromKab) || provName;
      }
    }

    var found = wilayahMaps.kecCount > 0 ? Boolean(kecObj) : Boolean(kabObj || provName);

    return {
      provinsi: provName || "Tidak ditemukan",
      kabupatenKota: kabName || "Tidak ditemukan",
      kecamatan: kecName || "Tidak ditemukan",
      found: found,
    };
  }

  function setStatus(message, type) {
    statusEl.textContent = message || "";
    statusEl.className = "";
    if (type) {
      statusEl.classList.add("status-" + type);
    }
  }

  function isValidDate(day, month, year) {
    var date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function formatDate(day, month, year) {
    var dd = String(day).padStart(2, "0");
    var mm = String(month).padStart(2, "0");
    return dd + "-" + mm + "-" + year;
  }

  function clearOutput() {
    outKodeWilayah.textContent = "-";
    outProvinsi.textContent = "-";
    outKab.textContent = "-";
    outKec.textContent = "-";
    outLahir.textContent = "-";
    outGender.textContent = "-";
    outUrut.textContent = "-";
    setButtonDisabled(copyBtn, true);
    setButtonLoading(copyBtn, false);
    lastResult = null;
  }

  function decodeNik(nik) {
    if (nik.length !== 16) {
      return { ok: false, error: "NIK harus 16 digit." };
    }

    var kodeWilayah = nik.slice(0, 6);
    var wilayah = resolveWilayah(kodeWilayah);

    var dayRaw = parseInt(nik.slice(6, 8), 10);
    var month = parseInt(nik.slice(8, 10), 10);
    var yearPart = parseInt(nik.slice(10, 12), 10);

    if (isNaN(dayRaw) || isNaN(month) || isNaN(yearPart)) {
      return { ok: false, error: "Format NIK tidak valid." };
    }

    var gender = "Laki-laki";
    var day = dayRaw;
    if (dayRaw > 40) {
      gender = "Perempuan";
      day = dayRaw - 40;
    }

    var now = new Date();
    var currentYear = now.getFullYear() % 100;
    var century = yearPart <= currentYear ? 2000 : 1900;
    var fullYear = century + yearPart;

    var tanggalLahir = isValidDate(day, month, fullYear)
      ? formatDate(day, month, fullYear)
      : "Tidak valid";

    return {
      ok: true,
      nik: nik,
      kodeWilayah: kodeWilayah,
      provinsi: wilayah.provinsi,
      kabupatenKota: wilayah.kabupatenKota,
      kecamatan: wilayah.kecamatan,
      tanggalLahir: tanggalLahir,
      jenisKelamin: gender,
      nomorUrut: nik.slice(12, 16),
      wilayahDitemukan: wilayah.found,
    };
  }

  function renderResult(result) {
    outKodeWilayah.textContent = result.kodeWilayah;
    outProvinsi.textContent = result.provinsi;
    outKab.textContent = result.kabupatenKota;
    outKec.textContent = result.kecamatan;
    outLahir.textContent = result.tanggalLahir;
    outGender.textContent = result.jenisKelamin;
    outUrut.textContent = result.nomorUrut;
  }

  function updateCount() {
    charCountEl.textContent = input.value.length + "/16";
  }

  function handleInput() {
    var cleaned = input.value.replace(/\D/g, "");
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
    updateCount();
    setButtonDisabled(decodeBtn, input.value.length !== 16);
    if (input.value.length < 16) {
      setStatus("");
      clearOutput();
    }
  }

  function handleDecode(event) {
    event.preventDefault();
    var nik = input.value.trim();
    if (nik.length !== 16) {
      setStatus("NIK harus tepat 16 digit.", "error");
      clearOutput();
      return;
    }

    var result = decodeNik(nik);
    if (!result.ok) {
      setStatus(result.error, "error");
      clearOutput();
      return;
    }

    renderResult(result);
    lastResult = result;
    setButtonDisabled(copyBtn, false);
    setButtonLoading(copyBtn, false);

    if (!wilayahCount) {
      setStatus("Data wilayah belum diisi.", "warn");
    } else if (!result.wilayahDitemukan) {
      setStatus("Kode wilayah tidak ditemukan.", "warn");
    } else {
      setStatus("Dekode berhasil.", "ok");
    }
  }

  function buildCopyText(result) {
    return (
      "Ringkasan NIK\n" +
      "NIK: " +
      result.nik +
      "\n" +
      "Kode wilayah: " +
      result.kodeWilayah +
      "\n" +
      "Provinsi: " +
      result.provinsi +
      "\n" +
      "Kabupaten/Kota: " +
      result.kabupatenKota +
      "\n" +
      "Kecamatan: " +
      result.kecamatan +
      "\n" +
      "Tanggal lahir: " +
      result.tanggalLahir +
      "\n" +
      "Jenis kelamin: " +
      result.jenisKelamin +
      "\n" +
      "Nomor urut pendaftaran: " +
      result.nomorUrut
    );
  }

  function fallbackCopy(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
    return true;
  }

  function handleCopy() {
    if (!lastResult) {
      setStatus("Belum ada hasil untuk disalin.", "error");
      return;
    }
    var text = buildCopyText(lastResult);
    setButtonLoading(copyBtn, true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          setStatus("Ringkasan disalin.", "ok");
          setButtonLoading(copyBtn, false);
        })
        .catch(function () {
          var ok = fallbackCopy(text);
          setStatus(ok ? "Ringkasan disalin." : "Gagal menyalin.", ok ? "ok" : "error");
          setButtonLoading(copyBtn, false);
        });
    } else {
      var ok = fallbackCopy(text);
      setStatus(ok ? "Ringkasan disalin." : "Gagal menyalin.", ok ? "ok" : "error");
      setButtonLoading(copyBtn, false);
    }
  }

  input.addEventListener("input", handleInput);
  form.addEventListener("submit", handleDecode);
  copyBtn.addEventListener("click", handleCopy);
  setButtonDisabled(decodeBtn, true);
  setButtonDisabled(copyBtn, true);
  setButtonLoading(copyBtn, false);
  updateCount();
  clearOutput();
})();
