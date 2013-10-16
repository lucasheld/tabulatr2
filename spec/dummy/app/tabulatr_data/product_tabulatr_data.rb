class ProductTabulatrData < Tabulatr::Data

  search :title

  # search do |query| "adsd like query" end

  column :id
  column :title
  column :price do "#{price} EUR" end # <- Block evaluiert im Kontext EINES Records
  column :edit_link do link_to "edit #{title}", product_path(id) end
  # column :name,
  #   sort: "firstname || ' ' || lastname"
  #   filter: "firstname || ' ' || lastname"
  #   do
  #     "#{firstname} #{lastname}"
  # end
  column :active
  column :updated_at do "#{updated_at.strftime('%H:%M %d.%m.%Y')}" end
  association :vendor, :name
  association :tags, :title do "'#{tags.map(&:title).map(&:upcase).join(', ')}'" end

end