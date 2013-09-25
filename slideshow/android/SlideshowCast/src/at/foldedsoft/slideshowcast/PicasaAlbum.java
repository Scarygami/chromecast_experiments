package at.foldedsoft.slideshowcast;

public class PicasaAlbum {
  public String id;
  public String name;
  public int photos;
  public String url;
  public String image;
  
  public PicasaAlbum(String id, String name, int photos, String url, String image) {
    this.id = id;
    this.url = url;
    this.image = image;
    this.name = name;
    this.photos = photos;
  }
}
