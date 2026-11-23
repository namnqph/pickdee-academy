/*
  Nén ảnh sản phẩm Shop ngay trên máy trước khi tải lên Supabase Storage
  (gói free 1GB — ảnh chụp điện thoại 5–10MB phải giảm còn ~100–300KB).

  window.pdCompressImage(file) → Promise<File>
  window.pdUploadOgJpg(sb, storagePath, file) → Promise<void>
  - Ảnh không phải JPG (Zalo không hiện .webp khi xem trước link) → tự dựng bản JPG ≤1000px
    nền trắng, tải lên shop-products/og/<storagePath đổi đuôi .jpg> cho functions/og/p/[file].js.
  - MỌI ảnh (cả JPG) thêm bản nhỏ ≤600px → shop-products/og-s/… (thẻ link Messenger tải kịp, 23/11).
  - Không bao giờ báo lỗi ra ngoài: hỏng thì link chỉ hiện ảnh thương hiệu.
  - Cạnh dài tối đa 1600px, WebP 0.82 (trình duyệt không hỗ trợ WebP thì JPEG 0.85).
  - Giữ nguyên file gốc nếu: không phải ảnh, là GIF, đã nhỏ (≤ 350KB và ≤ 1600px),
    hoặc bản nén không nhỏ hơn bản gốc, hoặc có lỗi.
*/
(function () {
  const MAX_SIDE = 1600;
  const SMALL_BYTES = 350 * 1024;

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, type, quality);
    });
  }

  async function loadBitmap(file) {
    if (window.createImageBitmap) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (_) {}
    }

    return await new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Không đọc được ảnh."));
      };
      img.src = url;
    });
  }

  window.pdOgJpgPath = function (storagePath) {
    return "og/" + String(storagePath).replace(/\.[^./]+$/, "") + ".jpg";
  };

  // Bản NHỎ (≤600px) cho thẻ link Messenger/Zalo: máy người gửi tự tải ảnh lúc soạn tin, ảnh to là mất ảnh (23/11).
  window.pdOgSmallPath = function (storagePath) {
    return "og-s/" + String(storagePath).replace(/\.[^./]+$/, "") + ".jpg";
  };

  async function jpegOf(bitmap, maxSide, quality) {
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return await canvasToBlob(canvas, "image/jpeg", quality);
  }

  async function putJpg(sb, path, blob) {
    if (!blob) {
      return;
    }

    const result = await sb.storage
      .from("shop-products")
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg"
      });

    if (result.error) {
      console.warn("pdUploadOgJpg", path, result.error);
    }
  }

  window.pdUploadOgJpg = async function (sb, storagePath, file) {
    try {
      if (!sb || !file) {
        return;
      }

      const bitmap = await loadBitmap(file);

      if (!/\.jpe?g$/i.test(storagePath)) {
        await putJpg(sb, window.pdOgJpgPath(storagePath), await jpegOf(bitmap, 1000, 0.85));
      }

      await putJpg(sb, window.pdOgSmallPath(storagePath), await jpegOf(bitmap, 600, 0.8));

      if (bitmap.close) {
        bitmap.close();
      }
    } catch (error) {
      console.warn("pdUploadOgJpg", error);
    }
  };

  window.pdCompressImage = async function (file) {
    try {
      if (!file || !file.type || !file.type.startsWith("image/") || file.type === "image/gif") {
        return file;
      }

      const bitmap = await loadBitmap(file);
      const width = bitmap.width || bitmap.naturalWidth;
      const height = bitmap.height || bitmap.naturalHeight;

      if (!width || !height) {
        return file;
      }

      if (file.size <= SMALL_BYTES && Math.max(width, height) <= MAX_SIDE) {
        return file;
      }

      const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      if (bitmap.close) {
        bitmap.close();
      }

      let blob = await canvasToBlob(canvas, "image/webp", 0.82);
      let ext = "webp";

      if (!blob || blob.type !== "image/webp") {
        blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
        ext = "jpg";
      }

      if (!blob || blob.size >= file.size) {
        return file;
      }

      const base = String(file.name || "anh").replace(/\.[^.]+$/, "");

      return new File([blob], base + "." + ext, {
        type: blob.type,
        lastModified: Date.now()
      });
    } catch (error) {
      console.warn("pdCompressImage: giữ ảnh gốc", error);
      return file;
    }
  };
})();
