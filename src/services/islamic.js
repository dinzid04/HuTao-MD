const axios = require('axios');
const moment = require('moment-timezone');

const ASMAUL_HUSNA = [
    { no: 1, arab: "الرَّحْمَنُ", latin: "Ar-Rahman", arti: "Yang Maha Pengasih" },
    { no: 2, arab: "الرَّحِيمُ", latin: "Ar-Rahim", arti: "Yang Maha Penyayang" },
    { no: 3, arab: "الْمَلِكُ", latin: "Al-Malik", arti: "Yang Maha Merajai / Memerintah" },
    { no: 4, arab: "الْقُدُّوسُ", latin: "Al-Quddus", arti: "Yang Maha Suci" },
    { no: 5, arab: "السَّلاَمُ", latin: "As-Salam", arti: "Yang Maha Memberi Kesejahteraan" },
    { no: 6, arab: "الْمُؤْمِنُ", latin: "Al-Mu'min", arti: "Yang Maha Memberi Keamanan" },
    { no: 7, arab: "الْمُهَيْمِنُ", latin: "Al-Muhaimin", arti: "Yang Maha Pemelihara" },
    { no: 8, arab: "الْعَزِيزُ", latin: "Al-Aziz", arti: "Yang Maha Perkasa" },
    { no: 9, arab: "الْجَبَّارُ", latin: "Al-Jabbar", arti: "Yang Maha Memaksa / Gagah" },
    { no: 10, arab: "الْمُتَكَبِّرُ", latin: "Al-Mutakabbir", arti: "Yang Maha Memiliki Kebesaran" },
    { no: 11, arab: "الْخَالِقُ", latin: "Al-Khaliq", arti: "Yang Maha Pencipta" },
    { no: 12, arab: "الْبَارِئُ", latin: "Al-Bari'", arti: "Yang Maha Melepaskan / Merencanakan" },
    { no: 13, arab: "الْمُصَوِّرُ", latin: "Al-Mushawwir", arti: "Yang Maha Membentuk Rupa" },
    { no: 14, arab: "الْغَفَّارُ", latin: "Al-Ghaffar", arti: "Yang Maha Pengampun" },
    { no: 15, arab: "الْقَهَّارُ", latin: "Al-Qahhar", arti: "Yang Maha Menundukkan / Berkuasa" },
    { no: 16, arab: "الْوَهَّابُ", latin: "Al-Wahhab", arti: "Yang Maha Pemberi Karunia" },
    { no: 17, arab: "الرَّزَّاقُ", latin: "Ar-Razzaq", arti: "Yang Maha Pemberi Rezeki" },
    { no: 18, arab: "الْفَتَّاحُ", latin: "Al-Fattah", arti: "Yang Maha Pembuka Rahmat" },
    { no: 19, arab: "الْعَلِيمُ", latin: "Al-Alim", arti: "Yang Maha Mengetahui" },
    { no: 20, arab: "الْقَابِضُ", latin: "Al-Qabidh", arti: "Yang Maha Menyempitkan" },
    { no: 21, arab: "الْبَاسِطُ", latin: "Al-Basith", arti: "Yang Maha Melapangkan" },
    { no: 22, arab: "الْخَافِضُ", latin: "Al-Khafidh", arti: "Yang Maha Merendahkan" },
    { no: 23, arab: "الرَّافِعُ", latin: "Ar-Rafi'", arti: "Yang Maha Meninggikan" },
    { no: 24, arab: "الْمُعِزُّ", latin: "Al-Mu'izz", arti: "Yang Maha Memuliakan" },
    { no: 25, arab: "المُذِلُّ", latin: "Al-Mudzill", arti: "Yang Maha Menghinakan" },
    { no: 26, arab: "السَّمِيعُ", latin: "As-Sami'", arti: "Yang Maha Mendengar" },
    { no: 27, arab: "الْبَصِيرُ", latin: "Al-Bashir", arti: "Yang Maha Melihat" },
    { no: 28, arab: "الْحَكَمُ", latin: "Al-Hakam", arti: "Yang Maha Menetapkan Hukum" },
    { no: 29, arab: "الْعَدْلُ", latin: "Al-Adl", arti: "Yang Maha Adil" },
    { no: 30, arab: "اللَّطِيفُ", latin: "Al-Lathif", arti: "Yang Maha Lembut" },
    { no: 31, arab: "الْخَبِيرُ", latin: "Al-Khabir", arti: "Yang Maha Mengenal / Teliti" },
    { no: 32, arab: "الْحَلِيمُ", latin: "Al-Halim", arti: "Yang Maha Penyantun" },
    { no: 33, arab: "الْعَظِيمُ", latin: "Al-Azhim", arti: "Yang Maha Agung" },
    { no: 34, arab: "الْغَفُورُ", latin: "Al-Ghafur", arti: "Yang Maha Pengampun" },
    { no: 35, arab: "الشَّكُورُ", latin: "Asy-Syakur", arti: "Yang Maha Menghargai / Mensyukuri" },
    { no: 36, arab: "الْعَلِيُّ", latin: "Al-Aliyy", arti: "Yang Maha Tinggi" },
    { no: 37, arab: "الْكَبِيرُ", latin: "Al-Kabir", arti: "Yang Maha Besar" },
    { no: 38, arab: "الْحَفِيظُ", latin: "Al-Hafizh", arti: "Yang Maha Memelihara" },
    { no: 39, arab: "المُقيِت", latin: "Al-Muqit", arti: "Yang Maha Pemberi Kecukupan" },
    { no: 40, arab: "الْحسِيبُ", latin: "Al-Hasib", arti: "Yang Maha Membuat Perhitungan" },
    { no: 41, arab: "الْجَلِيلُ", latin: "Al-Jalil", arti: "Yang Maha Mulia / Luhur" },
    { no: 42, arab: "الْكَرِيمُ", latin: "Al-Karim", arti: "Yang Maha Pemurah" },
    { no: 43, arab: "الرَّقِيبُ", latin: "Ar-Raqib", arti: "Yang Maha Mengawasi" },
    { no: 44, arab: "الْمُجِيبُ", latin: "Al-Mujib", arti: "Yang Maha Mengabulkan Doa" },
    { no: 45, arab: "الْوَاسِعُ", latin: "Al-Wasi'", arti: "Yang Maha Luas Rahmat-Nya" },
    { no: 46, arab: "الْحَكِيمُ", latin: "Al-Hakim", arti: "Yang Maha Bijaksana" },
    { no: 47, arab: "الْوَدُودُ", latin: "Al-Wadud", arti: "Yang Maha Mengasihi" },
    { no: 48, arab: "الْمَجِيدُ", latin: "Al-Majid", arti: "Yang Maha Mulia" },
    { no: 49, arab: "الْبَاعِثُ", latin: "Al-Ba'its", arti: "Yang Maha Membangkitkan" },
    { no: 50, arab: "الشَّهِيدُ", latin: "Asy-Syahid", arti: "Yang Maha Menyaksikan" },
    { no: 51, arab: "الْحَقُّ", latin: "Al-Haqq", arti: "Yang Maha Benar" },
    { no: 52, arab: "الْوَكِيلُ", latin: "Al-Wakil", arti: "Yang Maha Memelihara Penyerahan" },
    { no: 53, arab: "الْقَوِيُّ", latin: "Al-Qawiyy", arti: "Yang Maha Kuat" },
    { no: 54, arab: "الْمَتِينُ", latin: "Al-Matin", arti: "Yang Maha Kokoh" },
    { no: 55, arab: "الْوَلِيُّ", latin: "Al-Waliyy", arti: "Yang Maha Melindungi" },
    { no: 56, arab: "الْحَمِيدُ", latin: "Al-Hamid", arti: "Yang Maha Terpuji" },
    { no: 57, arab: "الْمُحْصِي", latin: "Al-Muhshi", arti: "Yang Maha Menghitung Segala Sesuatu" },
    { no: 58, arab: "الْمُبْدِئُ", latin: "Al-Mubdi'", arti: "Yang Maha Memulai" },
    { no: 59, arab: "الْمُعِيدُ", latin: "Al-Mu'id", arti: "Yang Maha Mengembalikan Kehidupan" },
    { no: 60, arab: "الْمُحْيِي", latin: "Al-Muhyi", arti: "Yang Maha Menghidupkan" },
    { no: 61, arab: "اَلْمُمِيتُ", latin: "Al-Mumit", arti: "Yang Maha Mematikan" },
    { no: 62, arab: "الْحَيُّ", latin: "Al-Hayy", arti: "Yang Maha Hidup Kekal" },
    { no: 63, arab: "الْقَيُّومُ", latin: "Al-Qayyum", arti: "Yang Maha Mandiri Berdiri Sendiri" },
    { no: 64, arab: "الْوَاجِدُ", latin: "Al-Wajid", arti: "Yang Maha Menemukan" },
    { no: 65, arab: "الْمَاجِدُ", latin: "Al-Majid", arti: "Yang Maha Mulia" },
    { no: 66, arab: "الْوَاحِدُ", latin: "Al-Wahid", arti: "Yang Maha Tunggal" },
    { no: 67, arab: "اَلاَحَدُ", latin: "Al-Ahad", arti: "Yang Maha Esa" },
    { no: 68, arab: "الصَّمَدُ", latin: "Ash-Shamad", arti: "Yang Maha Dibutuhkan Tempat Bergantung" },
    { no: 69, arab: "الْقَادِرُ", latin: "Al-Qadir", arti: "Yang Maha Menentukan / Berkuasa" },
    { no: 70, arab: "الْمُقْتَدِرُ", latin: "Al-Muqtadir", arti: "Yang Maha Berkuasa Menentukan" },
    { no: 71, arab: "الْمُقَدِّمُ", latin: "Al-Muqaddim", arti: "Yang Maha Mendahulukan" },
    { no: 72, arab: "الْمُؤَخِّرُ", latin: "Al-Mu'akkhir", arti: "Yang Maha Mengakhirkan" },
    { no: 73, arab: "الأوَّلُ", latin: "Al-Awwal", arti: "Yang Maha Awal Tanpa Permulaan" },
    { no: 74, arab: "الآخِرُ", latin: "Al-Akhir", arti: "Yang Maha Akhir Tanpa Batas" },
    { no: 75, arab: "الظَّاهِرُ", latin: "Azh-Zhahir", arti: "Yang Maha Nyata Bukti-Nya" },
    { no: 76, arab: "الْبَاطِنُ", latin: "Al-Bathin", arti: "Yang Maha Ghaib / Tersembunyi" },
    { no: 77, arab: "الْوَالِي", latin: "Al-Wali", arti: "Yang Maha Memerintah Segala Urusan" },
    { no: 78, arab: "الْمُتَعَالِي", latin: "Al-Muta'ali", arti: "Yang Maha Tinggi Keluhuran-Nya" },
    { no: 79, arab: "الْبَرُّ", latin: "Al-Barr", arti: "Yang Maha Penderma Kebajikan" },
    { no: 80, arab: "التَّوَابُ", latin: "At-Tawwab", arti: "Yang Maha Penerima Taubat" },
    { no: 81, arab: "الْمُنْتَقِمُ", latin: "Al-Muntaqim", arti: "Yang Maha Memberi Balasan Hukuman" },
    { no: 82, arab: "العَفُوُّ", latin: "Al-Afuww", arti: "Yang Maha Pemaaf" },
    { no: 83, arab: "الرَّؤُوفُ", latin: "Ar-Ra'uf", arti: "Yang Maha Pengasih / Lemah Lembut" },
    { no: 84, arab: "مَالِكُ الْمُلْكِ", latin: "Malik-ul-Mulk", arti: "Penguasa Kerajaan Alam Semesta" },
    { no: 85, arab: "ذُوالْجَلاَلِ وَالإكْرَامِ", latin: "Dzul-Jalali wal-Ikram", arti: "Pemilik Keagungan dan Kemuliaan" },
    { no: 86, arab: "الْمُقْسِطُ", latin: "Al-Muqsith", arti: "Yang Maha Pemberi Keadilan" },
    { no: 87, arab: "الْجَامِعُ", latin: "Al-Jami'", arti: "Yang Maha Mengumpulkan" },
    { no: 88, arab: "الْغَنِيُّ", latin: "Al-Ghaniyy", arti: "Yang Maha Kaya Raya Mandiri" },
    { no: 89, arab: "الْمُغْنِي", latin: "Al-Mughni", arti: "Yang Maha Memberi Kekayaan" },
    { no: 90, arab: "الْمَانِعُ", latin: "Al-Mani'", arti: "Yang Maha Mencegah Bahaya" },
    { no: 91, arab: "الضَّارَّ", latin: "Adh-Dharr", arti: "Yang Maha Mendatangkan Madharat" },
    { no: 92, arab: "النَّافِعُ", latin: "An-Nafi'", arti: "Yang Maha Memberi Manfaat" },
    { no: 93, arab: "النُّورُ", latin: "An-Nur", arti: "Yang Maha Bercahaya Menerangi" },
    { no: 94, arab: "الْهَادِي", latin: "Al-Hadi", arti: "Yang Maha Pemberi Petunjuk Hidayah" },
    { no: 95, arab: "الْبَدِيعُ", latin: "Al-Badi'", arti: "Yang Maha Pencipta Keindahan Tanpa Contoh" },
    { no: 96, arab: "اَلْبَاقِي", latin: "Al-Baqi", arti: "Yang Maha Kekal Abadi" },
    { no: 97, arab: "الْوَارِثُ", latin: "Al-Warits", arti: "Yang Maha Mewarisi Seluruh Alam" },
    { no: 98, arab: "الرَّشِيدُ", latin: "Ar-Rasyid", arti: "Yang Maha Pandai Memberi Bimbingan" },
    { no: 99, arab: "الصَّبُورُ", latin: "Ash-Shabur", arti: "Yang Maha Sabar" }
];

const DOA_HARIAN = {
    "makan": {
        judul: "Doa Sebelum Makan",
        arab: "اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ",
        latin: "Allahumma baarik lanaa fiimaa razaqtanaa wa qinaa 'adzaaban naar.",
        arti: "Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka."
    },
    "setelahmakan": {
        judul: "Doa Sesudah Makan",
        arab: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
        latin: "Alhamdulillahilladzi ath'amanaa wa saqaanaa wa ja'alanaa muslimiin.",
        arti: "Segala puji bagi Allah yang telah memberi makan dan minum kepada kami serta menjadikan kami termasuk orang-orang muslim."
    },
    "tidur": {
        judul: "Doa Sebelum Tidur",
        arab: "بِاسْمِكَ اللَّهُمَّ أَحْيَا وَأَمُوتُ",
        latin: "Bismika allahumma ahyaa wa amuutu.",
        arti: "Dengan menyebut nama-Mu ya Allah, aku hidup dan aku mati."
    },
    "banguntidur": {
        judul: "Doa Bangun Tidur",
        arab: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        latin: "Alhamdulillahilladzi ahyaanaa ba'da maa amaatanaa wa ilaihin nusyuur.",
        arti: "Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami dan kepada-Nya lah kami dibangkitkan."
    },
    "masukwc": {
        judul: "Doa Masuk Kamar Mandi / WC",
        arab: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
        latin: "Allahumma innii a'uudzu bika minal khubutsi wal khabaa'its.",
        arti: "Ya Allah, sesungguhnya aku berlindung kepada-Mu dari godaan setan laki-laki dan setan perempuan."
    },
    "keluarwc": {
        judul: "Doa Keluar Kamar Mandi / WC",
        arab: "غُفْرَانَكَ، الْحَمْدُ لِلَّهِ الَّذِي أَذْهَبَ عَنِّي الأَذَى وَعَافَانِي",
        latin: "Ghufranaka, alhamdulillahilladzi adzhaba 'annil adzaa wa 'aafaanii.",
        arti: "Aku memohon ampunan-Mu. Segala puji bagi Allah yang telah menghilangkan penyakit dari badanku dan menjaga kesehatanku."
    },
    "keluarrumah": {
        judul: "Doa Keluar Rumah",
        arab: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ",
        latin: "Bismillahi tawakkaltu 'alallahi, laa haula wa laa quwwata illaa billah.",
        arti: "Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan kecuali dengan pertolongan Allah."
    },
    "masukrumah": {
        judul: "Doa Masuk Rumah",
        arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
        latin: "Allahumma innii as'aluka khairal mauliji wa khairal makhraji bismillahi walajnaa wa bismillahi kharajnaa wa 'alallahi rabbinaa tawakkalnaa.",
        arti: "Ya Allah, sesungguhnya aku memohon kepada-Mu kebaikan tempat masuk dan kebaikan tempat keluar. Dengan nama Allah kami masuk dan dengan nama Allah kami keluar serta kepada Allah Tuhan kami, kami bertawakal."
    },
    "belajar": {
        judul: "Doa Sebelum Belajar",
        arab: "رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا",
        latin: "Rabbi zidnii 'ilman warzuqnii fahman.",
        arti: "Ya Tuhanku, tambahkanlah ilmu kepadaku dan anugerahilah aku pemahaman yang baik."
    },
    "orangtua": {
        judul: "Doa untuk Kedua Orang Tua",
        arab: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        latin: "Rabbighfir lii wa liwaalidayya warhamhumaa kamaa rabbayaanii shaghiiraa.",
        arti: "Ya Tuhanku, ampunilah dosaku dan dosa kedua orang tuaku, serta sayangilah mereka sebagaimana mereka telah mendidikku di waktu kecil."
    },
    "selamat": {
        judul: "Doa Selamat Dunia dan Akhirat (Sapu Jagad)",
        arab: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        latin: "Rabbanaa aatinaa fid dunyaa hasanatan wa fil aakhirati hasanatan wa qinaa 'adzaaban naar.",
        arti: "Ya Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat serta peliharalah kami dari siksa api neraka."
    }
};

const ISLAMIC_ENGINE = {

    async getQuran(surahNo = 1, ayahNo = null) {
        try {
            const res = await axios.get(`https://equran.id/api/v2/surat/${surahNo}`, { timeout: 15000 });
            const s = res.data?.data;
            if (!s) return { success: false, message: `❌ Surah nomor *${surahNo}* tidak ditemukan.` };

            if (ayahNo && s.ayat?.[ayahNo - 1]) {
                const a = s.ayat[ayahNo - 1];
                let text = `\`⌜ AL-QURAN DIGITAL ⌟\`\n`;
                text += `> ◦ Surah : *${s.namaLatin}* (${s.nama}) - Ayat ${a.nomorAyat}\n`;
                text += `> ◦ Arti : ${s.arti} (${s.tempatTurun})\n\n`;
                text += `*بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ*\n\n`;
                text += `*${a.teksArab}*\n\n`;
                text += `_“${a.teksLatin}”_\n\n`;
                text += `*Artinya:* \n${a.teksIndonesia}\n\n`;
                text += `🎧 Audio: ${a.audio?.['01'] || s.audioFull?.['01']}`;
                return { success: true, message: text.trim(), audioUrl: a.audio?.['01'] };
            }

            let text = `\`⌜ SURAH ${s.namaLatin.toUpperCase()} (${s.nama}) ⌟\`\n`;
            text += `> ◦ Nomor : Surah Ke-${s.nomor}\n`;
            text += `> ◦ Jumlah Ayat : ${s.jumlahAyat} Ayat\n`;
            text += `> ◦ Golongan : ${s.tempatTurun}\n`;
            text += `> ◦ Arti : *${s.arti}*\n\n`;
            text += `*DESKRIPSI SURAH:*\n${s.deskripsi.replace(/<[^>]*>?/gm, '').slice(0, 450)}...\n\n`;
            text += `_Ketik *.ayat ${s.nomor} <no_ayat>* untuk membaca ayat spesifik beserta terjemahannya._\n`;
            text += `_Ketik *.murottal ${s.nomor}* untuk mendengarkan audio murottal lengkap._`;

            return { success: true, message: text.trim(), audioUrl: s.audioFull?.['01'] };
        } catch (e) {
            return { success: false, message: `❌ Gagal mengambil data Al-Quran: ${e.message}` };
        }
    },

    async getAyat(surahQuery, ayahNo) {
        let surahNum = parseInt(surahQuery);
        if (isNaN(surahNum)) surahNum = 1;
        const targetAyat = parseInt(ayahNo) || 1;
        return await this.getQuran(surahNum, targetAyat);
    },

    async getMurottal(surahNo = 1) {
        try {
            const num = parseInt(surahNo) || 1;
            const res = await axios.get(`https://equran.id/api/v2/surat/${num}`, { timeout: 15000 });
            const s = res.data?.data;
            if (!s || !s.audioFull?.['01']) return { success: false, message: `❌ Audio Murottal Surah ${num} tidak ditemukan.` };
            return {
                success: true,
                title: `Murottal Surah ${s.namaLatin} (${s.nama})`,
                surahName: s.namaLatin,
                audioUrl: s.audioFull['01'],
                message: `\`⌜ MUROTTAL AL-QURAN ⌟\`\n> ◦ Surah : *${s.namaLatin}* (${s.nama})\n> ◦ Qari : *Syaikh Misyari Rasyid Al-Afasy*\n> ◦ Durasi Ayat : ${s.jumlahAyat} Ayat\n\n_Sedang mengirimkan audio murottal..._`
            };
        } catch (e) {
            return { success: false, message: `❌ Gagal mengambil audio murottal: ${e.message}` };
        }
    },

    async getTafsir(surahNo = 1) {
        try {
            const num = parseInt(surahNo) || 1;
            const res = await axios.get(`https://equran.id/api/v2/tafsir/${num}`, { timeout: 15000 });
            const s = res.data?.data;
            if (!s) return { success: false, message: `❌ Tafsir Surah ${num} tidak ditemukan.` };

            let sampleTafsir = (s.tafsir?.[0]?.teks || 'Tafsir ayat pertama.').slice(0, 400);
            let text = `\`⌜ TAFSIR KEMENAG RI ⌟\`\n`;
            text += `> ◦ Surah : *${s.namaLatin}* (${s.nama})\n`;
            text += `> ◦ Jumlah Ayat : ${s.jumlahAyat} Ayat\n\n`;
            text += `*Tafsir Ringkas Ayat 1:*\n${sampleTafsir}...\n\n`;
            text += `_Sumber: Aplikasi Tafsir Kementerian Agama Republik Indonesia._`;
            return { success: true, message: text.trim() };
        } catch (e) {
            return { success: false, message: `❌ Gagal mengambil data tafsir: ${e.message}` };
        }
    },

    async getJadwalSholat(city = 'Jakarta') {
        try {
            const targetCity = (city || 'Jakarta').trim();
            const dateStr = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
            const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity`, {
                params: {
                    city: targetCity,
                    country: 'Indonesia',
                    method: 11
                },
                timeout: 15000
            });

            const timings = res.data?.data?.timings;
            if (!timings) return { success: false, message: `❌ Jadwal sholat untuk kota *${targetCity}* tidak ditemukan.` };

            const hijri = res.data?.data?.date?.hijri;
            let text = `\`⌜ JADWAL SHOLAT HARI INI ⌟\`\n`;
            text += `> ◦ Wilayah : *${targetCity.toUpperCase()}*\n`;
            text += `> ◦ Tanggal : ${moment().tz('Asia/Jakarta').format('DD MMMM YYYY')}\n`;
            text += `> ◦ Hijriah : ${hijri ? `${hijri.day} ${hijri.month?.en} ${hijri.year} H` : '-'}\n\n`;
            text += `*WAKTU SHOLAT:*\n`;
            text += `> ◦ 🌌 *Imsak*   : ${timings.Imsak} WIB\n`;
            text += `> ◦ 🌅 *Subuh*   : ${timings.Fajr} WIB\n`;
            text += `> ◦ ☀️ *Terbit*  : ${timings.Sunrise} WIB\n`;
            text += `> ◦ 🌞 *Dzuhur*  : ${timings.Dhuhr} WIB\n`;
            text += `> ◦ 🌇 *Ashar*   : ${timings.Asr} WIB\n`;
            text += `> ◦ 🌆 *Maghrib* : ${timings.Maghrib} WIB\n`;
            text += `> ◦ 🌃 *Isya*    : ${timings.Isha} WIB\n\n`;
            text += `_“Sesungguhnya shalat itu adalah fardhu yang ditentukan waktunya atas orang-orang yang beriman.” (QS. An-Nisa: 103)_`;

            return { success: true, message: text.trim() };
        } catch (e) {
            return { success: false, message: `❌ Gagal mengambil jadwal sholat: ${e.message}` };
        }
    },

    getDoaHarian(query) {
        const q = (query || '').toLowerCase().replace(/[^a-z]/g, '');
        if (q && DOA_HARIAN[q]) {
            const d = DOA_HARIAN[q];
            return {
                success: true,
                message: `\`⌜ ${d.judul.toUpperCase()} ⌟\`\n\n*${d.arab}*\n\n_“${d.latin}”_\n\n*Artinya:*\n${d.arti}`
            };
        }

        const keys = Object.keys(DOA_HARIAN);
        let list = `\`⌜ KUMPULAN DOA HARIAN ⌟\`\n> ◦ Ketik: *.doaharian <nama_doa>*\n\n*DAFTAR DOA TERSEDIA:*\n`;
        keys.forEach((k, idx) => {
            list += `> ${idx + 1}. *${k}* - ${DOA_HARIAN[k].judul}\n`;
        });
        return { success: true, message: list.trim() };
    },

    getAsmaulHusna(query) {
        if (query && !isNaN(parseInt(query))) {
            const no = parseInt(query);
            const found = ASMAUL_HUSNA.find(a => a.no === no);
            if (found) {
                return {
                    success: true,
                    message: `\`⌜ ASMAUL HUSNA #${found.no} ⌟\`\n\n*${found.arab}*\n*${found.latin}*\n\n*Artinya:* ${found.arti}`
                };
            }
        }
        if (query) {
            const found = ASMAUL_HUSNA.find(a => a.latin.toLowerCase().includes(query.toLowerCase()) || a.arti.toLowerCase().includes(query.toLowerCase()));
            if (found) {
                return {
                    success: true,
                    message: `\`⌜ ASMAUL HUSNA #${found.no} ⌟\`\n\n*${found.arab}*\n*${found.latin}*\n\n*Artinya:* ${found.arti}`
                };
            }
        }

        let text = `\`⌜ 99 ASMAUL HUSNA ⌟\`\n> ◦ Ketik *.asmaulhusna <nomor/nama>* untuk detail.\n\n`;
        ASMAUL_HUSNA.slice(0, 33).forEach(a => {
            text += `*${a.no}. ${a.latin}* (${a.arab}) : ${a.arti}\n`;
        });
        text += `\n_...dan 66 nama agung lainnya. Ketik *.asmaulhusna 34-99* untuk mencari._`;
        return { success: true, message: text.trim() };
    },

    getDzikirPagi() {
        return {
            success: true,
            message: `\`⌜ DZIKIR PAGI (AL-MA'TSURAT) ⌟\`

1. *Ayat Kursi (1x)*
اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ...
_Barangsiapa membacanya di pagi hari, ia akan dilindungi dari godaan jin hingga sore._

2. *Sayyidul Istighfar (1x)*
اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ...
_“Ya Allah, Engkau Tuhanku, tiada tuhan selain Engkau...”_

3. *Doa Perlindungan (3x)*
بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ
_“Dengan nama Allah yang bersama nama-Nya tidak ada sesuatu pun di bumi maupun di langit yang dapat mendatangkan bahaya...”_

4. *Dzikir Pagi (3x)*
أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...`
        };
    },

    getDzikirPetang() {
        return {
            success: true,
            message: `\`⌜ DZIKIR PETANG / SORE ⌟\`

1. *Ayat Kursi (1x)*
اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ...
_Membentengi diri dari gangguan jin sepanjang malam hingga subuh._

2. *Surah Al-Ikhlas, Al-Falaq, An-Nas (Masing-masing 3x)*
_Mencukupkan dari segala keburukan dan marabahaya._

3. *Doa Petang (3x)*
أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...

4. *Permohonan Perlindungan Kalimat Allah (3x)*
أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ
_“Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan makhluk yang Dia ciptakan.”_`
        };
    },

    getDzikirSebelumTidur() {
        return {
            success: true,
            message: `\`⌜ SUNNAH & DZIKIR SEBELUM TIDUR ⌟\`

1. *Membaca Ayat Kursi (1x)*
2. *Membaca 2 Ayat Terakhir Surat Al-Baqarah (Ayat 285-286)*
3. *Meniupkan kedua telapak tangan lalu membaca Al-Ikhlas, Al-Falaq, An-Nas dan mengusapkan ke seluruh tubuh (3x)*
4. *Membaca Doa:*
بِاسْمِكَ اللَّهُمَّ أَحْيَا وَأَمُوتُ
_“Bismika Allahumma ahyaa wa amuutu.”_
5. *Membaca Tasbih (33x), Tahmid (33x), Takbir (34x).*`
        };
    },

    getDzikirSetelahSholat() {
        return {
            success: true,
            message: `\`⌜ WIRID & DZIKIR SESUDAH SHOLAT FARDHU ⌟\`

1. *Istighfar (3x)*
أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ

2. *Tahlil & Doa Keselamatan (3x)*
لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ
اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالإِكْرَامِ

3. *Membaca Ayat Kursi (1x)*
4. *Tasbih (33x):* سُبْحَانَ اللَّهِ
5. *Tahmid (33x):* الْحَمْدُ لِلَّهِ
6. *Takbir (33x):* اللَّهُ أَكْبَرُ
7. *Ditutup Tahlil Genap 100x.*`
        };
    },

    getTahlil() {
        return {
            success: true,
            message: `\`⌜ SUSUNAN BACAAN TAHLIL & DOA ARWAH ⌟\`

1. *Pengantar Fatihah (Hadhoroh):*
إِلَى حَضْرَةِ النَّبِيِّ الْمُصْطَفَى مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ... (Al-Fatihah)
2. *Membaca Surah Yasin / Al-Ikhlas (3x), Al-Falaq (1x), An-Nas (1x)*
3. *Awal Surah Al-Baqarah (Ayat 1-5)*
4. *Ayat Kursi (Al-Baqarah: 255)*
5. *Istighfar (3x)*
6. *Kalimat Tahlil (33x / 100x):*
لاَ إِلَهَ إِلاَّ اللَّهُ
7. *Sholawat Nabi (3x):*
اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ
8. *Doa Arwah Penutup Tahlil.*`
        };
    },

    getYasin() {
        return {
            success: true,
            message: `\`⌜ SURAH YASIN (83 AYAT) ⌟\`

يس ﴿١﴾ وَالْقُرْآنِ الْحَكِيمِ ﴿٢﴾ إِنَّكَ لَمِنَ الْمُرْسَلِينَ ﴿٣﴾ عَلَىٰ صِرَاطٍ مُّسْتَقِيمٍ ﴿٤﴾ تَنزِيلَ الْعَزِيزِ الرَّحِيمِ ﴿٥﴾ لِتُنذِرَ قَوْمًا مَّا أُنذِرَ آبَاؤُهُمْ فَهُمْ غَافِلُونَ ﴿٦﴾

*Keutamaan Surah Yasin:*
_“Segala sesuatu memiliki jantung (hati), dan jantung Al-Quran adalah Surah Yasin. Barangsiapa membacanya, Allah mencatat baginya pahala membaca Al-Quran sepuluh kali lipat.” (HR. Tirmidzi)_

_Gunakan *.quran 36* untuk membaca lengkap 83 ayat teks Arab, Latin & Terjemahannya._`
        };
    },

    getAyatKursi() {
        return {
            success: true,
            message: `\`⌜ AYAT KURSI (AL-BAQARAH: 255) ⌟\`

اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ

*Artinya:*
_“Allah, tidak ada Tuhan (yang berhak disembah) melainkan Dia Yang Hidup kekal lagi terus menerus mengurus (makhluk-Nya); tidak mengantuk dan tidak tidur. Kepunyaan-Nya apa yang di langit dan di bumi...”_`
        };
    },

    getKisahNabi(namaNabi = '') {
        const nabiList = {
            "adam": "Nabi Adam AS: Manusia pertama yang diciptakan Allah dari tanah dan menjadi khalifah pertama di bumi.",
            "idris": "Nabi Idris AS: Nabi yang dianugerahi kepandaian menulis dengan pena, menjahit baju, dan menguasai ilmu perbintangan.",
            "nuh": "Nabi Nuh AS: Membangun bahtera kapal raksasa atas perintah Allah untuk menyelamatkan kaum beriman dari banjir bandang dahsyat.",
            "ibrahim": "Nabi Ibrahim AS: Khalilullah (Kekasih Allah), bapak para nabi yang selamat saat dibakar oleh Raja Namrud.",
            "ismail": "Nabi Ismail AS: Putra Nabi Ibrahim yang ikhlas dan patuh saat hendak disembelih sebelum diganti kibas oleh Allah, cikal bakal ibadah Qurban.",
            "musa": "Nabi Musa AS: Kalimullah yang berdialog langsung dengan Allah, membelah Laut Merah dengan tongkatnya dan menumbangkan Fir'aun.",
            "isa": "Nabi Isa AS: Lahir dari Maryam tanpa ayah dengan izin Allah, memiliki mukjizat menghidupkan orang mati dan menyembuhkan penyakit kusta.",
            "muhammad": "Nabi Muhammad SAW: Penutup para nabi (Khatamun Nabiyyin), rasul pembawa risalah Islam bagi seluruh alam semesta dengan mukjizat abadi Al-Quran."
        };

        const key = namaNabi.toLowerCase().trim();
        if (key && nabiList[key]) {
            return {
                success: true,
                message: `\`⌜ KISAH NABI ${key.toUpperCase()} AS ⌟\`\n\n${nabiList[key]}`
            };
        }

        return {
            success: true,
            message: `\`⌜ KISAH 25 NABI & RASUL ⌟\`\n\n1. Adam AS\n2. Idris AS\n3. Nuh AS\n4. Hud AS\n5. Shaleh AS\n6. Ibrahim AS\n7. Luth AS\n8. Ismail AS\n9. Ishaq AS\n10. Ya'qub AS\n11. Yusuf AS\n12. Ayyub AS\n13. Syu'aib AS\n14. Musa AS\n15. Harun AS\n16. Zulkifli AS\n17. Daud AS\n18. Sulaiman AS\n19. Ilyas AS\n20. Ilyasa AS\n21. Yunus AS\n22. Zakaria AS\n23. Yahya AS\n24. Isa AS\n25. Muhammad SAW\n\n_Ketik *.kisahnabi <nama_nabi>* (contoh: *.kisahnabi musa*)_`
        };
    },

    getKisahSahabat(nama = '') {
        const sahabat = {
            "abubakar": "Abu Bakar Ash-Shiddiq RA: Sahabat terdekat Rasulullah, khalifah pertama, sosok paling jujur dan membenarkan peristiwa Isra Mi'raj.",
            "umar": "Umar bin Khattab RA: Al-Faruq (Pembeda kebenaran dan kebatilan), khalifah kedua yang adil, tegas, dan ditakuti oleh setan.",
            "utsman": "Utsman bin Affan RA: Dzun Nurain (Pemilik dua cahaya), khalifah ketiga yang sangat dermawan dan menghimpun mushaf Al-Quran.",
            "ali": "Ali bin Abi Thalib RA: Pintu ilmu, keponakan sekaligus menantu Rasulullah, ksatria pemberani di medan perang."
        };

        const key = nama.toLowerCase().replace(/[^a-z]/g, '');
        if (key && sahabat[key]) {
            return {
                success: true,
                message: `\`⌜ KISAH SAHABAT NABI ⌟\`\n\n${sahabat[key]}`
            };
        }

        return {
            success: true,
            message: `\`⌜ SAHABAT NABI (KHULAFAUR RASYIDIN) ⌟\`\n\n1. Abu Bakar Ash-Shiddiq RA\n2. Umar bin Khattab RA\n3. Utsman bin Affan RA\n4. Ali bin Abi Thalib RA\n\n_Ketik *.kisahsahabat <nama>* (contoh: *.kisahsahabat umar*)_`
        };
    },

    getHadits() {
        const list = [
            { periwayat: "HR. Bukhari & Muslim", matan: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ", arti: "Sesungguhnya setiap amal perbuatan tergantung pada niatnya." },
            { periwayat: "HR. Muslim", matan: "الدِّينُ النَّصِيحَةُ", arti: "Agama itu adalah nasihat." },
            { periwayat: "HR. Bukhari", matan: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", arti: "Sebaik-baik kalian adalah orang yang belajar Al-Quran dan mengajarkannya." },
            { periwayat: "HR. Tirmidzi", matan: "الْبِرُّ حُسْنُ الْخُلُقِ", arti: "Kebaikan itu adalah akhlak yang mulia." }
        ];
        const h = list[Math.floor(Math.random() * list.length)];
        return {
            success: true,
            message: `\`⌜ MUTIARA HADITS SHAHIH ⌟\`\n\n*${h.matan}*\n\n*Artinya:*\n_“${h.arti}”_\n\n📚 *Sumber:* ${h.periwayat}`
        };
    },

    getHaditsArbain(no = 1) {
        const num = Math.min(42, Math.max(1, parseInt(no) || 1));
        const arbain = [
            { no: 1, judul: "Ikhlas dan Niat", arab: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", arti: "Amal itu tergantung niatnya, dan seseorang hanya mendapatkan apa yang ia niatkan." },
            { no: 2, judul: "Islam, Iman, dan Ihsan (Hadits Jibril)", arab: "الإِسْلاَمُ أَنْ تَشْهَدَ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ...", arti: "Islam adalah bersaksi bahwa tiada tuhan selain Allah dan Muhammad adalah utusan Allah, mendirikan shalat, menunaikan zakat..." },
            { no: 3, judul: "Rukun Islam", arab: "بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ...", arti: "Islam dibangun di atas lima perkara: Syahadat, Shalat, Zakat, Haji, dan Puasa Ramadhan." }
        ];
        const found = arbain.find(a => a.no === num) || arbain[0];
        return {
            success: true,
            message: `\`⌜ HADITS ARBA'IN NAWAWI #${found.no} ⌟\`\n*Judul:* ${found.judul}\n\n*${found.arab}*\n\n*Artinya:*\n_“${found.arti}”_`
        };
    },

    getBacaanSholat() {
        return {
            success: true,
            message: `\`⌜ TATA CARA & BACAAN SHOLAT ⌟\`

1. *Niat & Takbiratul Ihram:*
اللهُ أَكْبَرُ (Allahu Akbar)

2. *Doa Iftitah:*
وَجَّهْتُ وَجْهِيَ لِلَّذِي فَطَرَ السَّمَاوَاتِ وَالأَرْضَ حَنِيفًا مُسْلِمًا وَمَا أَنَا مِنَ الْمُشْرِكِينَ...

3. *Rukuk (3x):*
سُبْحَانَ رَبِّيَ الْعَظِيمِ وَبِحَمْدِهِ

4. *I'tidal:*
سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ، رَبَّنَا لَكَ الْحَمْدُ...

5. *Sujud (3x):*
سُبْحَانَ رَبِّيَ الأَعْلَى وَبِحَمْدِهِ

6. *Duduk Antara Dua Sujud:*
رَبِّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَارْفَعْنِي وَارْزُقْنِي وَاهْدِنِي وَعَافِنِي وَاعْفُ عَنِّي

7. *Tahiyyat Akhir & Salam.*`
        };
    },

    getSholatJenazah() {
        return {
            success: true,
            message: `\`⌜ PANDUAN SHOLAT JENAZAH (4 TAKBIR) ⌟\`

• *Takbir 1:* Membaca Surah Al-Fatihah
• *Takbir 2:* Membaca Sholawat Nabi (Sholawat Ibrahimiyah)
• *Takbir 3:* Mendoakan Jenazah:
اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ
_(Untuk jenazah perempuan ganti 'lahu' menjadi 'laha')_
• *Takbir 4:* Doa Penutup:
اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهُ وَلاَ تَفْتِنَّا بَعْدَهُ وَاغْفِرْ لَنَا وَلَهُ
• *Salam ke kanan dan ke kiri.*`
        };
    },

    getSholatSunnah(jenis = '') {
        return {
            success: true,
            message: `\`⌜ PANDUAN SHOLAT SUNNAH ⌟\`

1. *Sholat Dhuha (2 - 8 Rakaat)*
Waktu: Setelah matahari terbit setinggi tombak hingga menjelang Dzuhur.
Keutamaan: Membuka pintu rezeki dan setara sedekah 360 persendian.

2. *Sholat Tahajud (Minimal 2 Rakaat)*
Waktu: Sepertiga malam terakhir setelah bangun tidur.
Keutamaan: Doa diijabah, diangkat ke derajat terpuji (Maqaman Mahmuda).

3. *Sholat Hajat (2 Rakaat)*
Untuk memohon dikabulkannya suatu hajat mendesak kepada Allah.

4. *Sholat Istikharah (2 Rakaat)*
Untuk memohon petunjuk di antara dua pilihan yang membingungkan.

5. *Sholat Witir (1, 3, hingga 11 Rakaat)*
Sholat penutup ibadah malam.`
        };
    },

    getNiatPuasa() {
        return {
            success: true,
            message: `\`⌜ BACAAN NIAT PUASA SUNNAH & WAJIB ⌟\`

1. *Puasa Ramadhan:*
نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى

2. *Puasa Senin:*
نَوَيْتُ صَوْمَ يَوْمِ الاِثْنَيْنِ سُنَّةً لِلَّهِ تَعَالَى

3. *Puasa Kamis:*
نَوَيْتُ صَوْمَ يَوْمِ الْخَمِيسِ سُنَّةً لِلَّهِ تَعَالَى

4. *Puasa Ayyamul Bidh (Tgl 13, 14, 15 Hijriah):*
نَوَيْتُ صَوْمَ أَيَّامِ الْبِيضِ سُنَّةً لِلَّهِ تَعَالَى

5. *Puasa Arafah (9 Dzulhijjah):*
نَوَيْتُ صَوْمَ عَرَفَةَ سُنَّةً لِلَّهِ تَعَالَى`
        };
    },

    getBacaanAswaja() {
        return {
            success: true,
            message: `\`⌜ AMALIAH ASWAJA (DOA QUNUT & RATIB) ⌟\`

• *Doa Qunut Shubuh:*
اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ...

• *Sayyidul Istighfar:*
اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ...

• *Ratib Al-Haddad / Al-Attas:*
Koleksi wirid dzikir pagi & petang perlindungan dari segala mara bahaya.`
        };
    },

    async getKalenderHijriah() {
        try {
            const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=Indonesia`, { timeout: 15000 });
            const h = res.data?.data?.date?.hijri;
            const g = res.data?.data?.date?.gregorian;

            let text = `\`⌜ KALENDER HIJRIAH & MASEHI ⌟\`\n`;
            text += `> ◦ Tanggal Masehi : *${g?.day} ${g?.month?.en} ${g?.year} M*\n`;
            text += `> ◦ Tanggal Hijriah : *${h?.day} ${h?.month?.en} (${h?.month?.ar}) ${h?.year} H*\n\n`;
            text += `*JADWAL PUASA SUNNAH BULAN INI:*\n`;
            text += `> ◦ Puasa Senin & Kamis (Setiap pekan)\n`;
            text += `> ◦ Puasa Ayyamul Bidh (13, 14, 15 ${h?.month?.en} ${h?.year} H)\n\n`;
            text += `_“Semoga hari ini penuh berkah dan ampunan dari Allah SWT.”_`;
            return { success: true, message: text.trim() };
        } catch (e) {
            return {
                success: true,
                message: `\`⌜ KALENDER HIJRIAH ⌟\`\n> ◦ Tanggal Masehi : *${moment().tz('Asia/Jakarta').format('DD MMMM YYYY')}*\n> ◦ Info : Gunakan *.jadwalsholat* untuk melihat waktu sholat hari ini.`
            };
        }
    }
};

module.exports = {
    ISLAMIC_ENGINE,
    ASMAUL_HUSNA,
    DOA_HARIAN
};
